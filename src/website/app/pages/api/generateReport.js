import PDFDocument from 'pdfkit';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = '';
  await new Promise((resolve) => {
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', resolve);
  });

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    res.status(400).end('Bad JSON');
    return;
  }

  const { summary, nodeMetrics = [], alerts = [] } = data;

  const doc = new PDFDocument();
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="FarmReport.pdf"');
    res.status(200).send(pdfBuffer);
  });

  doc.fontSize(20).text('TERRA Farm Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Overall Farm Health: ${summary?.health ?? "?"}%`);
  doc.text(`Total Nodes: ${nodeMetrics.length}`);
  doc.text(`Active Alerts: ${alerts.length}`);
  doc.end();
}
