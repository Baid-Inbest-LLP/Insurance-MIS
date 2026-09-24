import { notifications } from '@mantine/notifications';
import { getApiErrorMessage } from '../lib/queryClient';

export const notifyExportError = (err) =>
  notifications.show({ message: getApiErrorMessage(err, 'Export failed'), color: 'red' });

export const downloadBlobResponse = (response, fallbackFilename) => {
  const disposition = response.headers['content-disposition'] || '';
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || fallbackFilename;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
