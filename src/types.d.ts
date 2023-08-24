export interface DropcssOptions {
    html: string;
    css: string;

    shouldDrop?: (selector: string) => boolean;
    didRetain?: (selector: string) => void;
}

export default function dropcss(options: DropcssOptions): { css: string };