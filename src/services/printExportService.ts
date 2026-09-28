import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Sanitizes a filename to ensure safe download across all browsers and operating systems.
 * Removes slashes, colons, quotes, question marks, and other forbidden characters.
 */
export const sanitizeFilename = (filename: string, extension: string): string => {
  let clean = (filename || 'document')
    .replace(/[/\\?%*:|"<>#]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x20-\x7E\u0980-\u09FF_-]/g, '') // Keep ASCII, Bengali unicode, dashes and underscores
    .trim();

  if (!clean || clean === '_') {
    clean = 'export_document';
  }

  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  if (!clean.toLowerCase().endsWith(ext.toLowerCase())) {
    clean = `${clean}${ext}`;
  }
  return clean;
};

/**
 * Triggers a browser file download safely.
 * Avoids display:none which causes WebKit/Safari to ignore click events on the anchor.
 */
export const triggerFileDownload = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.download = filename;

  // Use fixed off-screen positioning instead of display:none
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '-9999px';
  link.style.width = '1px';
  link.style.height = '1px';
  link.style.opacity = '0';
  document.body.appendChild(link);

  try {
    link.click();
  } catch {
    link.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );
  }

  setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch {}
  }, 2000);
};

/**
 * Downloads a canvas element as a PNG file using a Blob object URL with DataURL fallback.
 */
export const downloadCanvasAsPNG = (
  canvas: HTMLCanvasElement,
  rawFilename: string
): Promise<void> => {
  const filename = sanitizeFilename(rawFilename, 'png');

  return new Promise((resolve) => {
    try {
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              triggerFileDownload(url, filename);
              setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
              }, 2000);
            } else {
              // Fallback to dataURL
              const dataUrl = canvas.toDataURL('image/png');
              triggerFileDownload(dataUrl, filename);
              resolve();
            }
          },
          'image/png',
          1.0
        );
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        triggerFileDownload(dataUrl, filename);
        resolve();
      }
    } catch (e) {
      console.warn('Canvas toBlob failed, attempting dataURL fallback', e);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        triggerFileDownload(dataUrl, filename);
      } catch (err2) {
        console.error('All PNG download attempts failed', err2);
      }
      resolve();
    }
  });
};

/**
 * Creates and downloads an A4 multi-page PDF embedding the provided canvases as crisp images.
 */
export const downloadPdfFromCanvases = (
  canvases: HTMLCanvasElement[],
  rawFilename: string
): void => {
  if (!canvases || canvases.length === 0) return;

  const finalName = sanitizeFilename(rawFilename, 'pdf');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < canvases.length; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const canvas = canvases[i];
    let imgData: string;
    try {
      imgData = canvas.toDataURL('image/jpeg', 0.96);
    } catch {
      imgData = canvas.toDataURL('image/png');
    }
    // A4 standard dimensions: 210 x 297 mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  try {
    pdf.save(finalName);
  } catch (saveErr) {
    console.warn('pdf.save failed, falling back to blob trigger', saveErr);
    try {
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      triggerFileDownload(blobUrl, finalName);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (blobErr) {
      console.error('PDF export failed completely', blobErr);
    }
  }
};

/**
 * Captures an array of HTML elements (typically .printable-a4-page or .daily-print-a4-page) as HTMLCanvasElements.
 */
export const capturePagesAsCanvases = async (
  pageElements: HTMLElement[],
  onProgress?: (current: number, total: number) => void
): Promise<HTMLCanvasElement[]> => {
  if (!pageElements || pageElements.length === 0) return [];

  // Wait for web fonts (Hind Siliguri, Noto Sans Bengali) to be fully loaded
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
    } catch {
      // Continue if font promise stalls
    }
  }

  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < pageElements.length; i++) {
    if (onProgress) {
      onProgress(i + 1, pageElements.length);
    }
    const el = pageElements[i];

    const targetHeight = Math.max(el.scrollHeight || 1123, 1123);
    const targetWidth = Math.max(el.offsetWidth || 794, 794);

    // High resolution A4: scale: 2 (approx 1588 x 2246 px)
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: targetWidth,
      height: targetHeight,
      windowWidth: 1200,
      windowHeight: targetHeight + 200,
      onclone: (_clonedDoc, clonedEl) => {
        clonedEl.style.visibility = 'visible';
        let parent = clonedEl.parentElement;
        while (parent) {
          if (parent.scrollTop) parent.scrollTop = 0;
          if (parent.scrollLeft) parent.scrollLeft = 0;
          parent = parent.parentElement;
        }
      },
    });

    canvases.push(canvas);
  }

  return canvases;
};
