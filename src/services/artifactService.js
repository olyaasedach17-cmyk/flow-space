import { auth } from '../firebase';

export async function createAIArtifact(payload) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Нужно войти в Flow Space');
  const token = await currentUser.getIdToken();
  const response = await fetch('/api/artifacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось создать файл');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  let filename = 'flow-space-ai-file';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) filename = decodeURIComponent(utfMatch[1]);
  return { blob, filename, contentType: response.headers.get('content-type') || blob.type };
}

export function downloadArtifact({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
