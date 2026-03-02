export const readFileAsString = (file: File): Promise<string> => {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = (e) => {
      e.target ? resolve(e.target.result as string) : reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.onabort = () => reject(new Error('File reading aborted'));
    reader.readAsText(file);
  });
};
