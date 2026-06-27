import api from '../api/client.js';

/**
 * Download the CSV export with the auth header attached (the export route is
 * behind auth, so a plain <a href> won't work). Streams as a blob.
 */
export async function downloadCustomersCsv(params = {}) {
  const res = await api.get('/customers/export', {
    params,
    responseType: 'blob',
  });
  // Guard against a non-CSV/empty body being saved as a "successful" .csv.
  const type = res.headers?.['content-type'] || '';
  if (res.data.size === 0 || !type.includes('csv')) {
    throw new Error('Export failed — unexpected response from server');
  }
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tanvicrm-customers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on a later tick so the download isn't cancelled in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
