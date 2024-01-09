let fileHandle = null;

export async function init() {
  fileHandle = await window.showOpenFilePicker();
  if (!fileHandle) return false;
  fileHandle = fileHandle[0];
  return true;
}

async function write(line) {
  const stream = await fileHandle.createWritable({keepExistingData: true});
  const offset = (await fileHandle.getFile()).size;
  await stream.seek(offset);
  await stream.write({type: 'write', data: line});
  await stream.close();
}

export async function writeHeader(line) {
  await write(`\n\n## ${line}\n\n`);
}

export async function writeLine(line) {
  await write(line + "\n");
}