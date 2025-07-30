// pages/api/generar-pdf.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

console.log("Versión nueva 🟩");


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="factura.pdf"');
 /*   if (req.method !== 'POST') {
     return res.status(405).json({ error: 'Método no permitido' });
   }


    const products = req.body.products;

    if (!Array.isArray(products)) {
     return res.status(400).json({ error: 'Formato inválido' });
    } */
    // Simulación de datos de compra


    const productos = [
      { nombre: 'Producto A', cantidad: 2, precio: 10 },
      { nombre: 'Producto B', cantidad: 1, precio: 25 }
    ];

    const total = productos.reduce((sum:any, p:any) => sum + p.cantidad * p.precio, 0);

    const qrTexto = 'https://generar-factura-8w01umyft-joses-projects-f0ad7e56.vercel.app/api/generar-pdf'; // Aquí pondrás luego el link real
    const qrImage = await QRCode.toDataURL(qrTexto);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 700]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();


   /*  const image = 'https://images.samsung.com/uk/smartphones/galaxy-z-fold7/images/galaxy-z-fold7-features-formfactor-on.png';
    const imageBytes = await fetch(image).then((res) => res.arrayBuffer());

    const renderimage =  await pdfDoc.embedPng(imageBytes);
    const pngDims = renderimage.scale(0.2)

    page.drawImage(renderimage, {
        x: page.getWidth() / 2 - pngDims.width / 2 + 75,
        y: page.getHeight() / 2 - pngDims.height,
        width: pngDims.width,
        height: pngDims.height,
    })  */

    const drawText = (text: string, y: number) => {
      page.drawText(text, { x: 200, y, size: 16, font, color: rgb(0, 0.53, 0.71) });
    };

    let y = height - 50;
    drawText('Resumen de compras:', y);
    y -= 30;

    productos.forEach((producto:any) => {
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="factura.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}
