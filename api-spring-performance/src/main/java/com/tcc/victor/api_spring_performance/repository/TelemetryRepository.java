package com.tcc.victor.api_spring_performance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tcc.victor.api_spring_performance.model.Telemetry;
import java.util.List;


@Repository
public interface TelemetryRepository extends JpaRepository<Telemetry, Long> {

    List<Telemetry> findBySensorId(String sensorId);

    @Query("SELECT AVG(t.value) FROM Telemetry t WHERE t.sensor.id = :sensorId")
    Double calculateAverageBySensorId(@Param("sensorId") String sensorId);
}
