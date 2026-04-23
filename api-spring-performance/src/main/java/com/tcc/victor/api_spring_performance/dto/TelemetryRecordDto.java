package com.tcc.victor.api_spring_performance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TelemetryRecordDto(
    @NotBlank(message = "O ID do sensor é obrigatório")
    String sensorId,

    @NotBlank(message = "A chave de API é obrigatória") 
    String apiKey,

    @NotNull(message = "O valor não pode ser nulo")
    @Positive(message = "O valor deve ser maior que zero")
    Double value,

    @NotBlank(message = "A unidade de medida é obrigatória")
    String unit
) {}