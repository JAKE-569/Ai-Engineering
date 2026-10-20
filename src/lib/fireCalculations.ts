export type CalculationStatus = 'PASS' | 'FAIL' | 'NEEDS_CONFIRMATION';

export interface FireCalculationInput {
  sprinklerHeads?: number;
  sprinklerFlowLpm?: number;
  simultaneousSprinklers?: number;
  hydrantCount?: number;
  hydrantFlowLpm?: number;
  simultaneousHydrants?: number;
  requiredRuntimeMin?: number;
  availableTankL?: number;
  staticHeadM?: number;
  frictionLossM?: number;
  fittingLossM?: number;
  terminalPressureM?: number;
  smokeAreaM2?: number;
  smokeAirChangesPerHour?: number;
  emergencyLoadsKw?: number;
  generatorCapacityKw?: number;
}

export interface FireCalculationResult {
  key: string;
  label: string;
  status: CalculationStatus;
  calculated?: number;
  required?: number;
  unit: string;
  formula: string;
  inputs: Record<string, number>;
  note: string;
}

const missing = (key: string, label: string, unit: string, formula: string, note: string): FireCalculationResult => ({
  key, label, status: 'NEEDS_CONFIRMATION', unit, formula, inputs: {}, note,
});

export function calculateFireEngineering(input: FireCalculationInput): FireCalculationResult[] {
  const results: FireCalculationResult[] = [];
  const sprinklerFlow = input.sprinklerFlowLpm && input.simultaneousSprinklers
    ? input.sprinklerFlowLpm * input.simultaneousSprinklers
    : undefined;
  results.push(sprinklerFlow && input.requiredRuntimeMin
    ? {
        key: 'sprinkler-water-demand', label: '스프링클러 필요 유량', status: 'PASS', calculated: sprinklerFlow,
        required: sprinklerFlow, unit: 'L/min', formula: '헤드 1개 유량 × 동시사용 헤드 수',
        inputs: { sprinklerFlowLpm: input.sprinklerFlowLpm!, simultaneousSprinklers: input.simultaneousSprinklers! },
        note: `계산 수원량: ${Math.round(sprinklerFlow * input.requiredRuntimeMin).toLocaleString()} L`,
      }
    : missing('sprinkler-water-demand', '스프링클러 필요 유량', 'L/min', '헤드 유량 × 동시사용 헤드 수', '헤드 유량과 동시사용 헤드 수가 모두 필요합니다.'));

  const hydrantFlow = input.hydrantFlowLpm && input.simultaneousHydrants
    ? input.hydrantFlowLpm * input.simultaneousHydrants
    : undefined;
  results.push(hydrantFlow
    ? { key: 'hydrant-water-demand', label: '옥내소화전 필요 유량', status: 'PASS', calculated: hydrantFlow, required: hydrantFlow, unit: 'L/min', formula: '소화전 1개 유량 × 동시사용 소화전 수', inputs: { hydrantFlowLpm: input.hydrantFlowLpm!, simultaneousHydrants: input.simultaneousHydrants! }, note: '법정 동시사용 개수는 대상물 기준 확인이 필요합니다.' }
    : missing('hydrant-water-demand', '옥내소화전 필요 유량', 'L/min', '소화전 유량 × 동시사용 개수', '소화전 유량과 동시사용 개수가 필요합니다.'));

  const demand = Math.max(sprinklerFlow || 0, 0) + Math.max(hydrantFlow || 0, 0);
  const requiredTank = demand && input.requiredRuntimeMin ? demand * input.requiredRuntimeMin : undefined;
  results.push(requiredTank && input.availableTankL
    ? { key: 'effective-water-storage', label: '소화수조 유효수량', status: input.availableTankL >= requiredTank ? 'PASS' : 'FAIL', calculated: input.availableTankL, required: requiredTank, unit: 'L', formula: '설비별 필요유량 합계 × 운전시간', inputs: { availableTankL: input.availableTankL, requiredRuntimeMin: input.requiredRuntimeMin }, note: input.availableTankL >= requiredTank ? '입력된 수조 유효수량이 계산 필요량 이상입니다.' : '수조 유효수량이 계산 필요량보다 작습니다.' }
    : missing('effective-water-storage', '소화수조 유효수량', 'L', '필요유량 합계 × 운전시간', '설비 유량, 운전시간, 수조 유효수량이 필요합니다.'));

  const pumpHead = input.staticHeadM !== undefined && input.frictionLossM !== undefined && input.fittingLossM !== undefined && input.terminalPressureM !== undefined
    ? input.staticHeadM + input.frictionLossM + input.fittingLossM + input.terminalPressureM
    : undefined;
  results.push(pumpHead !== undefined
    ? { key: 'pump-head', label: '소방펌프 필요 양정', status: 'PASS', calculated: pumpHead, required: pumpHead, unit: 'm', formula: '낙차 + 마찰손실 + 부속손실 + 말단 필요압력', inputs: { staticHeadM: input.staticHeadM!, frictionLossM: input.frictionLossM!, fittingLossM: input.fittingLossM!, terminalPressureM: input.terminalPressureM! }, note: '펌프 선정값과 비교해야 최종 적합 여부를 판정할 수 있습니다.' }
    : missing('pump-head', '소방펌프 필요 양정', 'm', '낙차 + 마찰손실 + 부속손실 + 말단압력', '양정 계산에 필요한 4개 입력값이 필요합니다.'));

  const smokeFlow = input.smokeAreaM2 && input.smokeAirChangesPerHour ? input.smokeAreaM2 * input.smokeAirChangesPerHour / 60 : undefined;
  results.push(smokeFlow
    ? { key: 'smoke-airflow', label: '제연 필요 풍량', status: 'NEEDS_CONFIRMATION', calculated: smokeFlow, required: smokeFlow, unit: 'm³/min', formula: '제연 대상면적 × 시간당 환기횟수 ÷ 60', inputs: { smokeAreaM2: input.smokeAreaM2!, smokeAirChangesPerHour: input.smokeAirChangesPerHour! }, note: '제연 방식과 법정 차압·풍량 기준을 대조해야 합니다.' }
    : missing('smoke-airflow', '제연 필요 풍량', 'm³/min', '대상면적 × 환기횟수 ÷ 60', '제연 면적과 설계 환기횟수가 필요합니다.'));

  results.push(input.emergencyLoadsKw !== undefined && input.generatorCapacityKw !== undefined
    ? { key: 'emergency-power', label: '소방 비상전원 용량', status: input.generatorCapacityKw >= input.emergencyLoadsKw ? 'PASS' : 'FAIL', calculated: input.generatorCapacityKw, required: input.emergencyLoadsKw, unit: 'kW', formula: '발전기 정격용량 ≥ 소방부하 합계', inputs: { emergencyLoadsKw: input.emergencyLoadsKw, generatorCapacityKw: input.generatorCapacityKw }, note: input.generatorCapacityKw >= input.emergencyLoadsKw ? '입력 용량이 소방부하 이상입니다.' : '발전기 용량이 소방부하보다 작습니다.' }
    : missing('emergency-power', '소방 비상전원 용량', 'kW', '발전기 용량 ≥ 소방부하 합계', '소방부하와 발전기 용량이 필요합니다.'));

  return results;
}
