package com.tcc.victor.api_spring_performance.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "telemetry")
@Data
public class Telemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) 
    @JoinColumn(name = "sensor_id", referencedColumnName = "id")
    private Sensor sensor;

    private Double value;
    private String unit;
    
    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
}