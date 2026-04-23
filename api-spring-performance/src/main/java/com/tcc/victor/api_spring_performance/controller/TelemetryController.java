package com.tcc.victor.api_spring_performance.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tcc.victor.api_spring_performance.dto.TelemetryRecordDto;
import com.tcc.victor.api_spring_performance.model.Telemetry;
import com.tcc.victor.api_spring_performance.service.TelemetryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {
    
    @Autowired
    private TelemetryService service;

    @GetMapping("/sensor/{sensorId}")
    public List<Telemetry> getBySensor(@PathVariable String sensorId) {
        return service.getDataBySensor(sensorId);
    }
    
    @GetMapping("/sensor/{sensorId}/average")
    public Double getAverage(@PathVariable String sensorId) {
        return service.calculateAverage(sensorId);
    }

    @PostMapping
    public ResponseEntity<Telemetry> create(@RequestBody @Valid TelemetryRecordDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.saveWithValidation(dto));
    }

    @PostMapping("/bulk")
    public ResponseEntity<String> createBulk(@RequestBody List<@Valid TelemetryRecordDto> dtos) {
        dtos.forEach(dto -> service.saveWithValidation(dto));
        return ResponseEntity.status(HttpStatus.CREATED).body("Lote processado com sucesso");
    }
}