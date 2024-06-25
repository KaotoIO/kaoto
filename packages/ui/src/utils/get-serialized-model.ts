export const getSerializedModel = (model: Record<string, unknown>): Record<string, unknown> => {
  Object.keys(model).forEach((key) => {
    if (typeof model[key] === 'string' && (model[key] as string).trim() === '') {
      delete model[key];
    }
  });

  return model;
};
