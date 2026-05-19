const path = require('path');
const { task, src, dest, series } = require('gulp');

task('build:meta', copyNodeMeta);
task('build:assets', copyIcons);
task('build:icons', series('build:assets', 'build:meta'));

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}

function copyNodeMeta() {
	// codex *.node.json files are not compiled by tsc; ship them next to the node.
	const metaSource = path.resolve('nodes', '**', '*.node.json');
	const metaDestination = path.resolve('dist', 'nodes');

	return src(metaSource).pipe(dest(metaDestination));
}
