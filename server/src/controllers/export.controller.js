import * as exportService from '../services/export.service.js';

export const exportCsv = async (req, res) => {
  const { model, ...filters } = req.validatedQuery || req.query;
  const csv = await exportService.exportCsv(model, filters);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${model}-export.csv"`);
  return res.status(200).send(csv);
};
