const fs = require('fs');

import cjs from 'rollup-plugin-cjs-es';
import buble from 'rollup-plugin-buble';
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
			file: './dist/dropcss.js',
			format: 'umd',
			banner,
		},
		plugins: [
			cjs({nested: true, cache: false}),
			buble({
				transforms: {stickyRegExp: false}
			}),
		]
	},
	{
		input: './src/dropcss.js',
		output: {
			name: 'dropcss',
			file: './dist/dropcss.cjs.js',
			format: 'cjs',
			banner,
		},
		plugins: [
			cjs({nested: true, cache: false}),
			buble({
				transforms: {stickyRegExp: false}
			}),
		]
	},
	{
		input: './src/dropcss.js',
		output: {
			name: 'dropcss',
			file: './dist/dropcss.min.js',
			format: 'umd',
			banner: "/*! " + urlVer + " */",
		},
		plugins: [
			cjs({nested: true, cache: false}),
			buble({
				transforms: {stickyRegExp: false}
			}),
			terser({
				output: {
					comments: /^!/
				}
			}),
		]
	},
]