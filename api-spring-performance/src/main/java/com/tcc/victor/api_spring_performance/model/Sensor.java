package com.tcc.victor.api_spring_performance.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "sensors")
@Data
public class Sensor {
    @Id
    private String id; // Ex: "sensor-01"

    @Column(name = "api_key", nullable = false)
    private String apiKey;

    private String name;
    private String location;
}