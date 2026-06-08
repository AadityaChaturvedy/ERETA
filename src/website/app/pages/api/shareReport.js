export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  // In production set NEXT_PUBLIC_BASE_URL in your .env.local to your deployment root
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const shareId = Math.random().toString(36).slice(2, 10);
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/shared/report/${shareId}`; // e.g. http://localhost:3000/shared/report/abc123
  res.status(200).json({ shareUrl });
}
