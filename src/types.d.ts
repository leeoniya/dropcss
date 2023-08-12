export interface DropcssOptions {
    html: string;
    css: string;

    shouldDrop?: (selector: string) => boolean;
    didRetain?: (selector: string) => void;

    keepText?: boolean;
}

export default function dropcss(options: DropcssOptions): { css: string };