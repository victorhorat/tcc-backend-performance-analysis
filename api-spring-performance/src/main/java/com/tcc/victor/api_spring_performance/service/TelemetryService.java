package com.tcc.victor.api_spring_performance.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import com.tcc.victor.api_spring_performance.model.Telemetry;
import com.tcc.victor.api_spring_performance.model.Sensor;
import com.tcc.victor.api_spring_performance.repository.TelemetryRepository;
import com.tcc.victor.api_spring_performance.repository.SensorRepository;
import com.tcc.victor.api_spring_performance.dto.TelemetryRecordDto;

@Service
public class TelemetryService {

    @Autowired
    private TelemetryRepository telemetryRepository;

    @Autowired
    private SensorRepository sensorRepository;

    @Transactional // Garante que a operação seja atômica (importante para performance)
    public Telemetry saveWithValidation(TelemetryRecordDto dto) {
        // 1. Busca o sensor pelo ID e pela API KEY enviada
        Sensor sensor = sensorRepository.findByIdAndApiKey(dto.sensorId(), dto.apiKey())
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Sensor não autorizado ou chave inválida"
                ));

        // 2. Mapeia o DTO para a Entity Telemetry
        Telemetry telemetry = new Telemetry();
        telemetry.setSensor(sensor); 
        telemetry.setValue(dto.value());
        telemetry.setUnit(dto.unit());
        
        // O timestamp já pode ser tratado no setTimestamp ou default da entity
        if (telemetry.getTimestamp() == null) {
            telemetry.setTimestamp(java.time.LocalDateTime.now());
        }

        // 3. Salva no banco
        return telemetryRepository.save(telemetry);
    }

    public List<Telemetry> getAllData() {
        return telemetryRepository.findAll();
    }

    public List<Telemetry> getDataBySensor(String sensorId){
        return telemetryRepository.findBySensorId(sensorId);
    }

    public Double calculateAverage(String sensorId){
        Double avg = telemetryRepository.calculateAverageBySensorId(sensorId);
        return avg != null ? avg : 0.0;
    }
}