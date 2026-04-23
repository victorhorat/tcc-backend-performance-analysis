package com.tcc.victor.api_spring_performance.controller;

import com.tcc.victor.api_spring_performance.model.Sensor;
import com.tcc.victor.api_spring_performance.service.SensorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sensors")
public class SensorController {

    @Autowired
    private SensorService sensorService;

    @PostMapping
    public ResponseEntity<Sensor> create(@RequestBody Sensor sensor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorService.saveSensor(sensor));
    }

    @GetMapping
    public List<Sensor> getAll() {
        return sensorService.getAllSensors();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        sensorService.deleteSensor(id);
    }
}