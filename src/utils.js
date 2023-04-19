export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
export const removeHtmlTags = (inputString) => {
  if (!inputString || inputString === '') {
    return '';
  }
  const inputStringCasted = inputString.toString();

  /*
   * Regular expression to identify HTML tags in
   * The input string. Replacing the identified
   * HTML tag with a null string.
   */
  return inputStringCasted.replace(/(<([^>]+)>)/gu, '');
};
