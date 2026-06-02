/**
 * Multer/busboy 常把 multipart 里 UTF-8 字节串当成 latin1，得到乱码。
 * 若字符串已含 BMP 外或典型中文（code point > 0xff），视为已是正确 Unicode，不再转。
 */
export function decodeMultipartUtf8(name: string): string {
    if (!name) return name;
    if (hasNonLatin1Chars(name)) {
        return name;
    }
    try {
        return Buffer.from(name, "latin1").toString("utf8");
    } catch {
        return name;
    }
}

function hasNonLatin1Chars(value: string): boolean {
    for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) > 0xff) return true;
    }
    return false;
}
