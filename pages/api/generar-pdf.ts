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

    const { products, total } = req.body;

    if (!Array.isArray(products) || typeof total !== 'number') {
      return res.status(400).json({ error: 'Formato de datos incorrecto' });
    }

    const qrTexto = 'https://generar-factura-app.vercel.app/api/generar-pdf';
    const qrImage = await QRCode.toDataURL(qrTexto);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 700]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const fechaActual = new Date().toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    page.drawText('Factura de Compra', {
      x: 50, y: height - 40, size: 20, font, color: rgb(0.2, 0.2, 0.6),
    });

    page.drawText(`Fecha: ${fechaActual}`, {
      x: width - 150, y: height - 40, size: 12, font, color: rgb(0.2, 0.2, 0.2),
    });

    let y = height - 80;
    page.drawText('Producto', { x: 50, y, size: 14, font, color: rgb(0, 0, 0) });
    page.drawText('Cant.',   { x: 220, y, size: 14, font, color: rgb(0, 0, 0) });
    page.drawText('Precio',  { x: 280, y, size: 14, font, color: rgb(0, 0, 0) });
    page.drawText('Costo',   { x: 350, y, size: 14, font, color: rgb(0, 0, 0) });
    page.drawText('Imagen',  { x: 420, y, size: 14, font, color: rgb(0, 0, 0) });

    y -= 25;

    for (const producto of products) {
      const { producto: nombre, cantidad, preciounitario: precio, Image: imagen, costo } = producto;

        page.drawText(producto.producto, { x: 50, y, size: 12, font });
        page.drawText(String(producto.cantidad), { x: 230, y, size: 12, font });
        page.drawText(`$${producto.preciounitario.toFixed(2)}`, { x: 290, y, size: 12, font });
        page.drawText(`$${producto.Costo.toFixed(2)}`, { x: 360, y, size: 12, font });


        try {
            const response = await fetch(imagen);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get("content-type") || "";

            let img;
            if (contentType.includes("image/webp")) {
                // Convertimos .webp a .png
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
                page.drawImage(img, {
                x: 420,
                y: y - dims.height + 10,
                width: dims.width,
                height: dims.height,
            });

        } catch (error) {
            console.warn(`No se pudo cargar la imagen para ${nombre}`, error);
        }

      y -= 70;
    }

    page.drawText(`TOTAL: $${total}`, {
      x: 50, y, size: 16, font, color: rgb(0, 0.53, 0.71),
    });

    const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
    const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImageEmbed, {
      x: width - 150,
      y: 50,
      width: 120,
      height: 120,
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const uniqueName = `factura-${crypto.randomUUID()}.pdf`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
     throw new Error('Token de Vercel Blob no configurado');
    }

    const { url } = await put(uniqueName, buffer, {
      access: 'public',
      token: token,
      contentType: 'application/pdf',
    });

    // Respondemos con la URL pública del PDF
    return res.status(200).json({ url });

 } catch (error: any) {
  console.error('Error interno:', error);
  res.status(500).json({ error: error.message});
}
}
