import { config } from 'dotenv';
const result = config();

//  console.log(result);

// Only override process.env if .env file is present and valid
if (!result.error) {
  /**
   * Notes:
   * - What we do iterate through this result object and assign process.env values
   */
  Object.keys(result.parsed).forEach((key) => {
    const value = result.parsed[key];
    if (value) {
      process.env[key] = value;
      //  console.log(process.env[key], value);
    }
  });
}
