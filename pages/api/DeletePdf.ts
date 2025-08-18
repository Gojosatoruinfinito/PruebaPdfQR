import { del } from "@vercel/blob";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método no permitido" });
  }

  try {
    let { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ success: false, error: "No se envió la URL del archivo" });
    }

    // Decodificamos en caso de que venga encodeada
    fileUrl = decodeURIComponent(fileUrl);

    console.log("Borrando blob:", fileUrl);

    await del(fileUrl);

    return res.status(200).json({ success: true, message: "Factura eliminada con éxito" });
  } catch (error: any) {
    console.error("Error eliminando:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
