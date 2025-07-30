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

    const fechaActual = new Date().toLocaleDateString('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric'
});

// Encabezado
page.drawText('Factura de Compra', {
  x: 50,
  y: height - 40,
  size: 20,
  font,
  color: rgb(0.2, 0.2, 0.6),
  // puedes usar Helvetica-Bold si la embebes
});

// Fecha en esquina superior derecha
page.drawText(`Fecha: ${fechaActual}`, {
  x: width - 150,
  y: height - 40,
  size: 12,
  font,
  color: rgb(0.2, 0.2, 0.2),
});

let y = height - 80;

// Títulos de columnas
page.drawText('Producto', { x: 50, y, size: 14, font, color: rgb(0, 0, 0) });
page.drawText('Cant.',   { x: 250, y, size: 14, font, color: rgb(0, 0, 0) });
page.drawText('Precio',  { x: 310, y, size: 14, font, color: rgb(0, 0, 0) });
page.drawText('Imagen',  { x: 400, y, size: 14, font, color: rgb(0, 0, 0) });

y -= 25;

for (const producto of products) {
  const { nombre, cantidad, precio, imagen } = producto;

  page.drawText(nombre,  { x: 50, y, size: 12, font });
  page.drawText(String(cantidad), { x: 260, y, size: 12, font });
  page.drawText(`$${precio}`, { x: 310, y, size: 12, font });

  const webpBuffer = await fetch(imagen).then(res => res.arrayBuffer());
  const pngBuffer = await sharp(Buffer.from(webpBuffer)).png().toBuffer();
  const img = await pdfDoc.embedPng(pngBuffer);
  const dims = img.scale(0.1);

  page.drawImage(img, {
    x: 400,
    y: y - dims.height + 5,
    width: dims.width,
    height: dims.height,
  });

  y -= 60;
}

// Total destacado
page.drawText(`TOTAL: $${total}`, {
  x: 50,
  y,
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
