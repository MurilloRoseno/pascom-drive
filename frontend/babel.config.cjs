// Inline Babel plugin: replaces import.meta.env.X with process.env.X for Jest.
// Vite handles import.meta.env natively at build time; this only runs in Jest.
function importMetaEnvPlugin({ types: t }) {
  return {
    visitor: {
      MemberExpression(path) {
        // Match import.meta.env.SOME_VAR
        if (
          t.isMetaProperty(path.node.object) &&
          path.node.object.meta.name === 'import' &&
          path.node.object.property.name === 'meta' &&
          t.isIdentifier(path.node.property, { name: 'env' })
        ) {
          path.replaceWith(
            t.memberExpression(t.identifier('process'), t.identifier('env'))
          );
        }
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [importMetaEnvPlugin],
};
