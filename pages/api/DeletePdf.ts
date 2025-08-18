import { del } from "@vercel/blob";
import type { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { fileUrl } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ success: false, error: "No se envió la URL del archivo" });
      }

      // Eliminamos el archivo
      await del(fileUrl);

      // Respuesta en JSON
      return res.status(200).json({ success: true, message: "Factura eliminada con éxito" });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: "Método no permitido" });
  }
}
