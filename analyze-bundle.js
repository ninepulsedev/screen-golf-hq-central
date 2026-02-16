const stats = require('./dist/bundle-stats.json');
const assets = stats.assets || [];

console.log('=== 번들 크기 분석 ===');
assets.forEach(asset => {
  if (asset.name.endsWith('.js') && !asset.name.endsWith('.map')) {
    const sizeKB = Math.round(asset.size / 1024);
    const sizeMB = (asset.size / (1024 * 1024)).toFixed(2);
    console.log(`${asset.name}: ${sizeKB} KiB (${sizeMB} MB)`);
  }
});

console.log('\n=== 청크별 분석 ===');
Object.keys(stats.assetsByChunkName || {}).forEach(chunkName => {
  const chunkFiles = stats.assetsByChunkName[chunkName];
  const jsFiles = chunkFiles.filter(file => file.endsWith('.js') && !file.endsWith('.map'));
  if (jsFiles.length > 0) {
    const asset = assets.find(a => a.name === jsFiles[0]);
    if (asset) {
      const sizeKB = Math.round(asset.size / 1024);
      console.log(`${chunkName}: ${sizeKB} KiB`);
    }
  }
});

// vendor 번들 상세 분석
console.log('\n=== Vendor 번들 상세 분석 ===');
const vendorAsset = assets.find(a => a.name.includes('vendor') && a.name.endsWith('.js'));
if (vendorAsset) {
  console.log(`Vendor 번들 크기: ${Math.round(vendorAsset.size / 1024)} KiB`);
  console.log('Vendor 번들에 포함된 주요 모듈:');
  
  // modules 정보가 있는 경우
  if (stats.modules) {
    const vendorModules = stats.modules.filter(module => 
      module.name && module.name.includes('node_modules')
    );
    
    // 모듈별 크기 집계
    const moduleSizes = {};
    vendorModules.forEach(module => {
      const size = module.size || 0;
      if (module.name) {
        // 라이브러리 이름 추출
        const libMatch = module.name.match(/node_modules\/([^\/]+)/);
        if (libMatch) {
          const libName = libMatch[1];
          moduleSizes[libName] = (moduleSizes[libName] || 0) + size;
        }
      }
    });
    
    // 크기순으로 정렬
    const sortedModules = Object.entries(moduleSizes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedModules.forEach(([libName, size]) => {
      const sizeKB = Math.round(size / 1024);
      console.log(`  ${libName}: ${sizeKB} KiB`);
    });
  }
}
