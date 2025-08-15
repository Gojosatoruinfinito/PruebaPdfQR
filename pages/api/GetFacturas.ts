    // pages/api/GetFacturas.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { list } from "@vercel/blob";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email es requerido" });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("Token de Vercel Blob no configurado");
    }

    // Listar todos los archivos en el bucket
    const { blobs } = await list({ token });

    // Filtrar facturas del email
    const facturas = blobs
      .filter(blob => blob.pathname.startsWith(`factura-${email}-`))
      .map(blob => {
        const parts = blob.pathname.replace(".pdf", "").split("-");
        // parts[1] = email, parts[2] = total
        const total = parseFloat(parts[2]) || 0;
        return {
          URL: blob.url,
          TIME: new Date(blob.uploadedAt).toLocaleString("es-ES", {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
          }),
          COST: `$${total.toFixed(2)}`
        };
      })
      // Ordenar de más reciente a más antiguo
      .sort((a, b) => new Date(b.TIME).getTime() - new Date(a.TIME).getTime());

    return res.status(200).json(facturas);

  } catch (error: any) {
    console.error("Error interno:", error);
    res.status(500).json({ error: error.message });
  }
}
