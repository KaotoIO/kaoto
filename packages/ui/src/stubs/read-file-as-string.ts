export const readFileAsString = (file: File): Promise<string> => {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = (e) => {
      e.target ? resolve(e.target.result as string) : reject();
    };
    reader.readAsText(file);
  });
};
