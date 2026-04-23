package com.tcc.victor.api_spring_performance.repository;

import com.tcc.victor.api_spring_performance.model.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SensorRepository extends JpaRepository<Sensor, String> {
    Optional<Sensor> findByIdAndApiKey(String id, String apiKey);
}