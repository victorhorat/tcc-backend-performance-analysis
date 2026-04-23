package com.tcc.victor.api_spring_performance.service;

import com.tcc.victor.api_spring_performance.model.Sensor;
import com.tcc.victor.api_spring_performance.repository.SensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class SensorService {

    @Autowired
    private SensorRepository repository;

    public Sensor saveSensor(Sensor sensor) {
        if (sensor.getApiKey() == null || sensor.getApiKey().isEmpty()) {
            sensor.setApiKey(java.util.UUID.randomUUID().toString());
        }
        return repository.save(sensor);
    }

    public List<Sensor> getAllSensors() {
        return repository.findAll();
    }

    public Sensor getSensorById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sensor não encontrado"));
    }

    public void deleteSensor(String id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sensor não existe");
        }
        repository.deleteById(id);
    }
}