export class CommonUtil {
  static generateRandomId = (kind: string, length = 4): string => {
    const randomNumber = Math.floor(Math.random() * 10 ** length);
    const randomNumberString = randomNumber.toString(10).padStart(4, '0');
    return `${kind}-${randomNumberString}`;
  };

  static readFileAsString = (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onload = (e) => {
        e.target ? resolve(e.target.result as string) : reject();
      };
      reader.readAsText(file);
    });
  };
}
