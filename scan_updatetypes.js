
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages/screen/js/app.data.js');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const prefix = 'window.DS_DATA = ';
    const jsonStr = content.substring(prefix.length);
    const data = JSON.parse(jsonStr);
    const config = JSON.parse(data.config);

    Object.keys(config).forEach(key => {
        const comp = config[key];
        if (comp && comp.data && comp.data.updateType) {
            console.log(`Component: ${comp.name} (${key})`);
            console.log(`  updateType: ${comp.data.updateType}`);
            console.log(`  getType: ${comp.data.getType}`);
        }
    });

} catch (err) {
    console.error(err);
}
