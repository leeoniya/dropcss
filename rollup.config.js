const fs = require('fs');

import { terser } from 'rollup-plugin-terser';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const ver = "v" + pkg.version;
const urlVer = "https://github.com/leeoniya/dropcss (" + ver + ")";
const banner = [
	"/**",
	"* Copyright (c) " + new Date().getFullYear() + ", Leon Sorokin",
	"* All rights reserved. (MIT Licensed)",
	"*",
	"* dropcss.js (DropCSS)",
	"* An exceptionally fast, thorough and tiny unused-CSS cleaner",
	"* " + urlVer,
	"*/",
	"",
].join("\n");

export default [
	{
		input: './src/dropcss.js',
		output: {
			name: 'dropcss',
			file: './dist/dropcss.cjs.js',
			format: 'cjs',
			exports: "auto",
			banner,
		},
	},
	{
		input: './src/dropcss.js',
		output: {
			name: 'dropcss',
			file: './dist/dropcss.iife.js',
			format: 'iife',
			esModule: false,
			banner,
		},
	},
	{
		input: './src/dropcss.js',
		output: {
			name: 'dropcss',
			file: './dist/dropcss.iife.min.js',
			format: 'iife',
			esModule: false,
			banner: "/*! " + urlVer + " */",
		},
		plugins: [
			terser({
				compress: {
					inline: 0,
					passes: 2,
					keep_fargs: false,
					pure_getters: true,
					unsafe: true,
					unsafe_comps: true,
					unsafe_math: true,
					unsafe_undefined: true,
				},
				output: {
					comments: /^!/
				}
			}),
		]
	},
]