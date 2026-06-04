import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

type IcoImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

/**
 * Encodes an array of PNG buffers into a single ICO file buffer.
 * Supports standard Windows ICO format structure.
 */
function encodeIco(images: IcoImage[]): Buffer {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const numImages = images.length;

  const totalSize =
    HEADER_SIZE +
    ENTRY_SIZE * numImages +
    images.reduce((acc, img) => acc + img.buffer.length, 0);
  const outBuffer = Buffer.alloc(totalSize);

  // Write ICO Header
  outBuffer.writeUInt16LE(0, 0); // Reserved (must be 0)
  outBuffer.writeUInt16LE(1, 2); // Image Type (1 for ICO)
  outBuffer.writeUInt16LE(numImages, 4); // Number of images

  let offset = HEADER_SIZE + ENTRY_SIZE * numImages;

  for (let i = 0; i < numImages; i++) {
    const img = images[i];
    const entryOffset = HEADER_SIZE + i * ENTRY_SIZE;

    // Write directory entry
    outBuffer.writeUInt8(img.width >= 256 ? 0 : img.width, entryOffset);
    outBuffer.writeUInt8(img.height >= 256 ? 0 : img.height, entryOffset + 1);
    outBuffer.writeUInt8(0, entryOffset + 2); // Color palette (0 for no palette)
    outBuffer.writeUInt8(0, entryOffset + 3); // Reserved (must be 0)
    outBuffer.writeUInt16LE(1, entryOffset + 4); // Color planes (1)
    outBuffer.writeUInt16LE(32, entryOffset + 6); // Bits per pixel (32-bit for alpha support)
    outBuffer.writeUInt32LE(img.buffer.length, entryOffset + 8); // Size of PNG data
    outBuffer.writeUInt32LE(offset, entryOffset + 12); // Offset to PNG data

    // Copy PNG data into the main buffer
    img.buffer.copy(outBuffer, offset);
    offset += img.buffer.length;
  }

  return outBuffer;
}

async function main() {
  const source = path.join(process.cwd(), "public", "favicon.png");

  console.log(`Reading source icon from: ${source}`);

  // Generate PNG sizes
  const sizes = [32, 192, 512, 180];
  const pngs: Record<number, Buffer> = {};

  for (const size of sizes) {
    pngs[size] = await sharp(source).resize(size, size).png().toBuffer();
  }

  // Save png icons
  await fs.writeFile(
    path.join(process.cwd(), "public", "icon-32.png"),
    pngs[32]
  );
  console.log("Saved public/icon-32.png");

  await fs.writeFile(
    path.join(process.cwd(), "public", "icon-192.png"),
    pngs[192]
  );
  console.log("Saved public/icon-192.png");

  await fs.writeFile(
    path.join(process.cwd(), "public", "icon-512.png"),
    pngs[512]
  );
  console.log("Saved public/icon-512.png");

  await fs.writeFile(
    path.join(process.cwd(), "public", "apple-icon.png"),
    pngs[180]
  );
  console.log("Saved public/apple-icon.png");

  // Generate multi-resolution ICO sizes for favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoImages: IcoImage[] = [];

  for (const size of icoSizes) {
    const buffer = await sharp(source).resize(size, size).png().toBuffer();
    icoImages.push({ buffer, width: size, height: size });
  }

  const icoBuffer = encodeIco(icoImages);

  await fs.writeFile(
    path.join(process.cwd(), "public", "favicon.ico"),
    icoBuffer
  );
  console.log("Saved public/favicon.ico");

  await fs.writeFile(path.join(process.cwd(), "app", "favicon.ico"), icoBuffer);
  console.log("Saved app/favicon.ico");

  console.log("Favicons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
