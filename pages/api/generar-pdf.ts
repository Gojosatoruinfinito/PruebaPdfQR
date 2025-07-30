import type { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp'; // ✅ Importamos sharp para convertir imágenes
import fetch from 'node-fetch'; // ✅ Importamos fetch porque Next.js en Node puede necesitarlo

console.log("Versión nueva 🟩");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="factura.pdf"');

    const productos = [
      { nombre: 'Producto A', cantidad: 2, precio: 10 },
      { nombre: 'Producto B', cantidad: 1, precio: 25 }
    ];

    const total = productos.reduce((sum: any, p: any) => sum + p.cantidad * p.precio, 0);

    const qrTexto = 'https://generar-factura-8w01umyft-joses-projects-f0ad7e56.vercel.app/api/generar-pdf';
    const qrImage = await QRCode.toDataURL(qrTexto);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 700]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    // ✅ Cargar imagen .webp y convertir a PNG
    const webpUrl = 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp';
    const webpBuffer = await fetch(webpUrl).then(res => res.arrayBuffer());

    // Convertir de webp a png con sharp
    const pngBuffer = await sharp(Buffer.from(webpBuffer)).png().toBuffer();

    // Insertar imagen convertida al PDF
    const pngImage = await pdfDoc.embedPng(pngBuffer);
    const dims = pngImage.scale(0.3); // escalar si es necesario

    page.drawImage(pngImage, {
      x: page.getWidth() / 2 - dims.width / 2,
      y: height / 2 - dims.height,
      width: dims.width,
      height: dims.height
    });

    const drawText = (text: string, y: number) => {
      page.drawText(text, { x: 200, y, size: 16, font, color: rgb(0, 0.53, 0.71) });
    };

    let y = height - 50;
    drawText('Resumen de compra:', y);
    y -= 30;

    productos.forEach((producto: any) => {
      drawText(`- ${producto.nombre} x${producto.cantidad} - $${producto.precio}`, y);
      y -= 20;
    });

    drawText(`Total: $${total}`, y - 10);

    // Insertar el código QR
    const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
    const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);
    page.drawImage(qrImageEmbed, {
      x: width - 150,
      y: 100,
      width: 120,
      height: 120
    });

    const pdfBytes = await pdfDoc.save();
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}
