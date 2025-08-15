// pages/api/generar-pdf.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { put } from '@vercel/blob';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { products, total, email } = req.body;

    if (!Array.isArray(products) || typeof total !== 'number') {
      return res.status(400).json({ error: 'Formato de datos incorrecto' });
    }

    const namefile = `factura-${email}${crypto.randomUUID()}.pdf`;

    const qrTexto = namefile;
    const qrImage = await QRCode.toDataURL(qrTexto);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 750]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const fechaActual = new Date().toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Datos de tienda
    page.drawText('SuperCompras C.A', {
      x: 50, y: height - 30, size: 12, font, color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('Dirección: Av. Simón Bolivar - Caracas', {
      x: 50, y: height - 45, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText('RIF:12345678-9  |  contacto@supercompras.com', {
      x: 50, y: height - 60, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`Fecha: ${fechaActual}`, {
      x: width - 150, y: height - 30, size: 12, font, color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText('Factura de Compra', {
      x: 50, y: height - 90, size: 20, font, color: rgb(0.2, 0.2, 0.6),
    });

    const headerY = height - 120;
    const colorFondo = rgb(0.2, 0.2, 0.6);
    page.drawRectangle({ x: 50, y: headerY - 10, width: 500, height: 25, color: colorFondo });

    page.drawText('Producto', { x: 60, y: headerY, size: 14, font, color: rgb(1, 1, 1) });
    page.drawText('Cant.', { x: 220, y: headerY, size: 14, font, color: rgb(1, 1, 1) });
    page.drawText('Precio', { x: 280, y: headerY, size: 14, font, color: rgb(1, 1, 1) });
    page.drawText('Costo', { x: 350, y: headerY, size: 14, font, color: rgb(1, 1, 1) });
    page.drawText('Imagen', { x: 420, y: headerY, size: 14, font, color: rgb(1, 1, 1) });

     let y = headerY - 80;
     const rowHeight = 80;

    for (const producto of products) {
      const { producto: nombre, cantidad, preciounitario: precio, Image: imagen, Costo } = producto;

      page.drawText(nombre, { x: 60, y, size: 12, font });
      page.drawText(String(cantidad), { x: 230, y, size: 12, font });
      page.drawText(`$${precio.toFixed(2)}`, { x: 290, y, size: 12, font });
      page.drawText(`$${Costo.toFixed(2)}`, { x: 360, y, size: 12, font });

      try {
        const response = await fetch(imagen);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get("content-type") || "";

        let img;
        if (contentType.includes("image/webp")) {
          const pngBuffer = await sharp(buffer).png().toBuffer();
          img = await pdfDoc.embedPng(pngBuffer);
        } else if (contentType.includes("image/png")) {
          img = await pdfDoc.embedPng(buffer);
        } else if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
          img = await pdfDoc.embedJpg(buffer);
        } else {
          throw new Error(`Formato de imagen no soportado: ${contentType}`);
        }

        const dims = img.scale(0.1);
        const imageY = y + (rowHeight / 2 - dims.height / 2) - 5;

        page.drawImage(img, {
          x: 420,
          y: imageY,
          width: dims.width,
          height: dims.height,
        });

        page.drawRectangle({ x: 50, y: y - 10, width: 500, height: 1, color: rgb(0.7, 0.7, 0.7) });

      } catch (error) {
        console.warn(`No se pudo cargar la imagen para ${nombre}`, error);
      }

      y -= rowHeight;
    }

    page.drawText(`TOTAL: $${total.toFixed(2)}`, {
      x: 60, y, size: 16, font, color: rgb(0.2, 0.2, 0.6),
    });

    const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
    const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImageEmbed, {
      x: width - 150,
      y: 50,
      width: 120,
      height: 120,
    });

    page.drawText('¡Gracias por su compra!', {
      x: 60,
      y: 60,
      size: 12,
      font,
      color: rgb(0, 0.5, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error('Token de Vercel Blob no configurado');
    }

    const { url } = await put(namefile, buffer, {
      access: 'public',
      token,
      contentType: 'application/pdf',
    });


    return res.status(200).json({ url });

  } catch (error: any) {
    console.error('Error interno:', error);
    res.status(500).json({ error: error.message });
  }
}
