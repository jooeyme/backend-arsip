
async function buildWorksheet(workbook, sheetName, rows, baseFields) {
  const ws = workbook.addWorksheet(sheetName);

  // 1) Kumpulkan semua jenis dokumen unik
  const counts = {};
  rows.forEach(r => {
    const byType = r.documents.reduce((acc, d) => {
      acc[d.type_doc] = (acc[d.type_doc]||0) + 1;
      return acc;
    }, {});
    Object.entries(byType).forEach(([type, c]) => {
      counts[type] = Math.max(counts[type]||0, c);
    });
  });
  const types = Object.keys(counts);
  const dynamicCols = [];

  // 2) Siapkan header: baseFields + dynamicCols
  types.forEach(type => {
    for (let i = 1; i <= counts[type]; i++) {
      dynamicCols.push({
        key:    `${type}_${i}`,
        header: `${type.replace(/_/g,' ')} ${i}`.replace(/\b\w/g, l => l.toUpperCase()),
        width:  30
      });
    }
  });
  ws.columns = [
    ...baseFields,
    ...dynamicCols
  ];

  // 3) Style header row
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF4472C4'} };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: {style:'thin'}, left:{style:'thin'},
      bottom:{style:'thin'}, right:{style:'thin'}
    };
  });

  // 4) Isi data
  rows.forEach(r => {
    // dasar object baris
    const data = {};
    baseFields.forEach(f => {
      data[f.key] = typeof f.getter === 'function'
        ? f.getter(r)
        : r[f.key];
    });
    // sisipkan masing‐masing dokumen
    types.forEach(type => {
      const docs = r.documents
        .filter(d => d.type_doc === type)
        .map(d => d.path_doc);
      // untuk tiap slot
      for (let i = 0; i < counts[type]; i++) {
        data[`${type}_${i+1}`] = docs[i] || '';
      }
    });
    ws.addRow(data);
  });

  return ws;
}

module.exports = { buildWorksheet }