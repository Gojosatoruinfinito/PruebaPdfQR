// pages/api/generar-pdf.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fetch from 'node-fetch';

console.log("Versión con POST 🟧");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const { products, total } = req.body;

    if (!Array.isArray(products) || typeof total !== 'number') {
      return res.status(400).json({ error: 'Formato de datos incorrecto' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="factura.pdf"');

    const qrTexto = 'https://generar-factura-app.vercel.app/api/generar-pdf';
    const qrImage = await QRCode.toDataURL(qrTexto);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 700]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    let y = height - 50;
    page.drawText('Resumen de compra:', {
      x: 200,
      y,
      size: 16,
      font,
      color: rgb(0, 0.53, 0.71),
    });
    y -= 30;

    for (const producto of products) {
      const { nombre, cantidad, precio, imagen } = producto;

      page.drawText(`- ${nombre} x${cantidad} - $${precio}`, {
        x: 50,
        y,
        size: 14,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      // ↓ Cargar imagen webp y convertir a PNG
      const webpBuffer = await fetch(imagen).then(res => res.arrayBuffer());
      const pngBuffer = await sharp(Buffer.from(webpBuffer)).png().toBuffer();
      const img = await pdfDoc.embedPng(pngBuffer);
      const dims = img.scale(0.2);

      page.drawImage(img, {
        x: width - dims.width - 50,
        y: y - dims.height + 10,
        width: dims.width,
        height: dims.height,
      });

      y -= 70; // espacio entre productos
    }

    page.drawText(`Total: $${total}`, {
      x: 50,
      y: y - 10,
      size: 16,
      font,
      color: rgb(0, 0.53, 0.71),
    });

    // Código QR
    const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
    const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImageEmbed, {
      x: width - 150,
      y: 50,
      width: 120,
      height: 120,
    });

    const pdfBytes = await pdfDoc.save();
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}
