#!/usr/bin/env node

/**
 * 图片列表生成工具
 * 扫描 images 目录下的所有图片文件，生成 images.json 文件列表
 */

const fs = require('fs');
const path = require('path');

// 配置
const IMAGES_DIR = './images';
const OUTPUT_FILE = './images.json';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 递归扫描目录获取所有图片文件
 * @param {string} dir 目录路径
 * @param {string} baseDir 基础目录（用于计算相对路径）
 * @returns {string[]} 图片文件相对路径数组
 */
function scanDirectory(dir, baseDir = dir) {
  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          // 计算相对于 images 目录的路径
          const relativePath = path.relative(baseDir, fullPath);
          // 统一使用正斜杠（Web 标准）
          const webPath = relativePath.replace(/\\/g, '/');
          results.push(webPath);
        }
      }
    }
  } catch (error) {
    console.error(`❌ 扫描目录失败: ${dir}`, error.message);
  }
  
  return results;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始扫描图片目录...');
  console.log(`📁 目标目录: ${IMAGES_DIR}`);
  console.log(`📝 输出文件: ${OUTPUT_FILE}`);
  console.log(`🖼️  支持格式: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  console.log('');
  
  // 检查 images 目录是否存在
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ 错误: 目录 ${IMAGES_DIR} 不存在`);
    console.log(`💡 提示: 请创建 images 目录并放入图片文件`);
    process.exit(1);
  }
  
  // 扫描目录
  const imageFiles = scanDirectory(IMAGES_DIR);
  
  // 按文件名排序
  imageFiles.sort();
  
  // 生成 JSON 数据
  const jsonData = {
    generatedAt: new Date().toISOString(),
    totalCount: imageFiles.length,
    baseDir: 'images',
    images: imageFiles
  };
  
  // 写入文件
  try {
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(jsonData, null, 2),
      'utf-8'
    );
    
    console.log('✅ 图片列表生成成功！');
    console.log('');
    console.log('📊 统计信息:');
    console.log(`   - 总计图片数: ${imageFiles.length}`);
    console.log(`   - 生成时间: ${jsonData.generatedAt}`);
    console.log('');
    
    if (imageFiles.length > 0) {
      console.log('📋 前 10 个文件:');
      imageFiles.slice(0, 10).forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      
      if (imageFiles.length > 10) {
        console.log(`   ... 还有 ${imageFiles.length - 10} 个文件`);
      }
    } else {
      console.warn('⚠️  警告: 未找到任何图片文件');
      console.log(`💡 提示: 请在 ${IMAGES_DIR} 目录中添加图片文件`);
    }
    
    console.log('');
    console.log(`✨ 已生成: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ 写入文件失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();