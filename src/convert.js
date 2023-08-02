import fs from 'fs/promises';
import yaml from 'js-yaml';

const convert = async function () {
  const files = await fs.readdir('./data');

  for (const fileName of files) {
    const fileData = await fs.readFile(`./data/${fileName}`);
    const data = yaml.load(fileData);

    const resultData = JSON.stringify(data, null, 2);

    // console.log(resultData /* .slice(0, 300) */, '\n');
    fs.writeFile(`./data2/${fileName}.json`, resultData, {
      encoding: 'utf8',
      flag: 'w+',
    });
  }
};

convert();
