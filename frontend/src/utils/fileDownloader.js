/**
 * Safe, authenticated artifact binary downloader
 * Directly fetches raw binary Blob from backend and triggers browser download
 */
export async function downloadArtifactFile(artifact) {
  if (!artifact || !artifact.id) {
    throw new Error('Invalid artifact: missing ID');
  }

  const token = localStorage.getItem('lifeops_token') || localStorage.getItem('lifeops_auth_token_v1') || '';
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const downloadUrl = `${apiBaseUrl}/artifacts/${artifact.id}/download`;

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    // Determine clean filename
    let filename = artifact.filename || artifact.name || 'lifeops_blueprint.pdf';
    if (artifact.artifact_type === 'PDF' && !filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Clean up object URL after delay
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 1000);

    return true;
  } catch (err) {
    console.error('Fetch download failed, attempting window fallback:', err);
    const fallbackUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;
    window.open(fallbackUrl, '_blank');
    return true;
  }
}
