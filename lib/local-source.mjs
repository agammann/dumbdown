import { constants } from "node:fs";
import { open } from "node:fs/promises";

const maximum = 60000;
const tooLarge = () => Error("File is too large. Use a snippet of at most 12,000 characters.");

export async function readLocalSource(filename) {
  const handle = await open(filename, constants.O_RDONLY | (constants.O_NONBLOCK || 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size > BigInt(maximum))
      throw tooLarge();
    const bytes = Buffer.alloc(maximum + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, length);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > maximum) throw tooLarge();
    const after = await handle.stat({ bigint: true });
    if (BigInt(length) !== before.size || after.size !== before.size ||
        after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs)
      throw Error("File changed while it was being read. Try again with a stable file.");
    return bytes.subarray(0, length).toString("utf8");
  } finally {
    await handle.close();
  }
}
