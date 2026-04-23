const fs = require('fs');
const { spawn } = require('child_process');

const FILE_NAME = 'setup_banco.sql';

console.log('Iniciando configuração massiva do banco para o Cenário B...');

const stream = fs.createWriteStream(FILE_NAME);

// Início do SQL
let setupSQL = `
BEGIN;

DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS sensors;

CREATE TABLE sensors (
    id VARCHAR(50) PRIMARY KEY,
    api_key VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE telemetry (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sensor FOREIGN KEY(sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Gerando 500 sensores automaticamente
`;

// LOOP PARA CRIAR OS 500 INSERTs
for (let i = 1; i <= 500; i++) {
    setupSQL += `INSERT INTO sensors (id, api_key, name, location) VALUES ('sensor-${i}', 'chave-mestra-tcc', 'Sensor ${i}', 'Recife');\n`;
}

setupSQL += `COMMIT;`;

stream.write(setupSQL);
stream.end();

// Parte do Docker (Permanece igual, pois o processo de execução é o mesmo)
stream.on('finish', () => {
    console.log('Script SQL com 500 sensores gerado.');
    const docker = spawn('docker', [
        'exec', '-i', '-e', 'PGPASSWORD=password_tcc', 
        'tcc_postgres', 
        'psql', '-U', 'user_tcc', '-d', 'telemetry_db', '-v', 'ON_ERROR_STOP=1' 
    ]);

    const fileStream = fs.createReadStream(FILE_NAME);
    fileStream.pipe(docker.stdin);

    docker.on('close', (code) => {
        if (code === 0) {
            console.log('\n--------------------------------------------------');
            console.log('✅ SUCESSO: Banco resetado e 500 sensores criados!');
            console.log('IDs: sensor-1 até sensor-500');
            console.log('Chave de todos: chave-mestra-tcc');
            console.log('--------------------------------------------------');
            fs.unlinkSync(FILE_NAME);
        } else {
            console.error(`\n❌ Falha na configuração. Código: ${code}`);
        }
    });
});