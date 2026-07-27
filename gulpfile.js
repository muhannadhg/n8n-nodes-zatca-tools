const path = require('path');
const { task, src, dest } = require('gulp');

// tsc does not copy the node icons, so the build does it here — n8n resolves
// `file:zatcatools.svg` relative to the compiled node in dist/.
task('build:icons', copyIcons);

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource, { encoding: false }).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource, { encoding: false, allowEmpty: true }).pipe(dest(credDestination));
}
