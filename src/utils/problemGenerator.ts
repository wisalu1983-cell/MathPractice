import { Problem, ProblemType, Difficulty } from '../types';

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 修改小数生成函数，确保总位数不超过5位
const getRandomDecimal = (min: number, max: number, maxDecimals: number = 1): number => {
  // 随机决定小数位数（1-3位）
  const decimalPlaces = getRandomInt(1, Math.min(maxDecimals, 3));
  
  // 计算整数部分的最大位数，确保总位数不超过5位
  const maxIntegerDigits = 5 - decimalPlaces;
  
  // 根据最大整数位数调整整数部分的范围
  let adjustedMin = min;
  let adjustedMax = max;
  
  if (maxIntegerDigits === 1) {
    adjustedMin = Math.max(min, 1);
    adjustedMax = Math.min(max, 9);
  } else if (maxIntegerDigits === 2) {
    adjustedMin = Math.max(min, 10);
    adjustedMax = Math.min(max, 99);
  } else if (maxIntegerDigits === 3) {
    adjustedMin = Math.max(min, 100);
    adjustedMax = Math.min(max, 999);
  } else if (maxIntegerDigits === 4) {
    adjustedMin = Math.max(min, 1000);
    adjustedMax = Math.min(max, 9999);
  }
  
  // 确保调整后的范围有效
  if (adjustedMin > adjustedMax) {
    adjustedMin = 1;
    adjustedMax = Math.pow(10, maxIntegerDigits) - 1;
  }
  
  const integerPart = getRandomInt(adjustedMin, adjustedMax);
  const factor = Math.pow(10, decimalPlaces);
  const decimalPart = getRandomInt(1, factor - 1) / factor;
  
  return Math.round((integerPart + decimalPart) * factor) / factor;
};

// 口算题生成器
const generateMentalProblem = (difficulty: Difficulty): Problem => {
  const id = Math.random().toString(36).substr(2, 9);
  
  if (difficulty === 'basic') {
    const operations = ['+', '-', '×', '÷'];
    const op = operations[getRandomInt(0, 3)];
    
    let operand1: number, operand2: number, answer: number | string, question: string;
    let isDivision = false;
    let quotient: number | undefined;
    let remainder: number | undefined;
    
    switch (op) {
      case '+':
        // 加法：15-999范围，必须进位
        operand1 = getRandomInt(15, 999);
        operand2 = getRandomInt(15, 999);
        // 确保进位
        if ((operand1 % 10) + (operand2 % 10) < 10) {
          operand2 += 10 - (operand2 % 10) + getRandomInt(1, 9);
        }
        answer = operand1 + operand2;
        question = `${operand1} + ${operand2}`;
        break;
        
      case '-':
        // 减法：15-999范围，必须借位
        operand2 = getRandomInt(15, 999);
        const tempAnswer = getRandomInt(15, 999);
        operand1 = tempAnswer + operand2;
        // 确保借位
        if ((operand1 % 10) >= (operand2 % 10)) {
          operand2 = (Math.floor(operand2 / 10) * 10) + (operand1 % 10) + getRandomInt(1, 9);
          if (operand2 > 999) operand2 = 999;
          operand1 = tempAnswer + operand2;
        }
        answer = operand1 - operand2;
        question = `${operand1} - ${operand2}`;
        break;
        
      case '×':
        // 乘法：一个个位数 × 一个2-3位数
        const singleDigit = getRandomInt(2, 9);
        const multiDigit = getRandomInt(10, 999);
        
        // 随机决定个位数在前还是在后
        if (Math.random() < 0.5) {
          answer = singleDigit * multiDigit;
          question = `${singleDigit} × ${multiDigit}`;
        } else {
          answer = multiDigit * singleDigit;
          question = `${multiDigit} × ${singleDigit}`;
        }
        break;
        
      case '÷':
        // 除法：一个2-3位数除以一个个位数，允许有余数
        const divisor = getRandomInt(2, 9);
        quotient = getRandomInt(2, 99);
        remainder = getRandomInt(0, divisor - 1);
        const dividend = quotient * divisor + remainder;
        
        isDivision = true;
        answer = `${quotient}……${remainder}`;
        question = `${dividend} ÷ ${divisor}`;
        break;
        
      default:
        operand1 = 10;
        operand2 = 5;
        answer = 15;
        question = '10 + 5';
    }
    
    return { 
      id, 
      type: 'mental', 
      difficulty, 
      question, 
      answer,
      isDivision,
      quotient,
      remainder
    };
  } else {
    // 挑战难度：确保四种运算类型平均分布，每种5题
    const operations = ['+', '-', '×', '÷'];
    const operationCounts = { '+': 0, '-': 0, '×': 0, '÷': 0 };
    
    // 根据当前生成的题目数量决定运算类型
    const totalGenerated = Math.floor(Math.random() * 20); // 模拟当前是第几题
    const currentOp = operations[totalGenerated % 4]; // 确保平均分布
    
    let question: string, answer: number | string;
    let isDivision = false;
    let quotient: number | undefined;
    let remainder: number | undefined;
    let explanation: string | undefined;
    
    // 25%概率出现速算技巧题
    const useShortcut = Math.random() < 0.25;
    
    switch (currentOp) {
      case '+':
        if (useShortcut) {
          // 加法速算技巧：凑整
          const base = getRandomInt(2, 9) * 100; // 200, 300, ..., 900
          const offset1 = getRandomInt(1, 20);
          const offset2 = getRandomInt(1, 20);
          const num1 = base - offset1;
          const num2 = base + offset2;
          answer = num1 + num2;
          question = `${num1} + ${num2}`;
          explanation = `可以凑整计算：${num1} + ${num2} = (${base} - ${offset1}) + (${base} + ${offset2}) = ${base * 2} + ${offset2 - offset1} = ${answer}`;
        } else {
          const a1 = getRandomInt(100, 9999);
          const a2 = getRandomInt(100, 9999);
          answer = a1 + a2;
          question = `${a1} + ${a2}`;
        }
        break;
        
      case '-':
        if (useShortcut) {
          // 减法速算技巧：接近整百数的减法
          const base = getRandomInt(3, 9) * 100; // 300, 400, ..., 900
          const offset = getRandomInt(1, 15);
          const minuend = getRandomInt(1000, 9999);
          const subtrahend = base - offset;
          answer = minuend - subtrahend;
          question = `${minuend} - ${subtrahend}`;
          explanation = `可以这样计算：${minuend} - ${subtrahend} = ${minuend} - ${base} + ${offset} = ${minuend - base} + ${offset} = ${answer}`;
        } else {
          const s2 = getRandomInt(100, 9999);
          const tempAnswer = getRandomInt(100, 9999);
          const s1 = tempAnswer + s2;
          answer = tempAnswer;
          question = `${s1} - ${s2}`;
        }
        break;
        
      case '×':
        if (useShortcut) {
          // 乘法速算技巧：接近整十数或整百数的乘法
          const base = getRandomInt(2, 9) * (Math.random() < 0.5 ? 10 : 100);
          const offset = getRandomInt(1, Math.min(10, base / 10));
          const multiplier = getRandomInt(2, 9);
          const multiplicand = base + (Math.random() < 0.5 ? offset : -offset);
          answer = multiplicand * multiplier;
          question = `${multiplicand} × ${multiplier}`;
          explanation = `可以分解计算：${multiplicand} × ${multiplier} = (${base} ${multiplicand > base ? '+' : '-'} ${Math.abs(multiplicand - base)}) × ${multiplier} = ${base * multiplier} ${multiplicand > base ? '+' : '-'} ${Math.abs(multiplicand - base) * multiplier} = ${answer}`;
        } else {
          // 普通乘法：修正bug - 确保不出现20×6这样的情况
          const multiType = Math.random() < 0.5 ? 'two_tens' : 'single_multi';
          
          if (multiType === 'two_tens') {
            // 两个十位数相乘：确保都是10-99范围
            const m1 = getRandomInt(10, 99);
            const m2 = getRandomInt(10, 99);
            answer = m1 * m2;
            question = `${m1} × ${m2}`;
          } else {
            // 一个个位数与一个十到万位数相乘：确保个位数是2-9，多位数是10-9999
            const singleDigit = getRandomInt(2, 9);
            const multiDigit = getRandomInt(10, 9999);
            
            if (Math.random() < 0.5) {
              answer = singleDigit * multiDigit;
              question = `${singleDigit} × ${multiDigit}`;
            } else {
              answer = multiDigit * singleDigit;
              question = `${multiDigit} × ${singleDigit}`;
            }
          }
        }
        break;
        
      case '÷':
        // 除法：被除数为2-4位数（100-9999），除数从3-19中取
        const divisor = getRandomInt(3, 19);
        quotient = getRandomInt(10, 999); // 确保商是2-3位数
        remainder = getRandomInt(0, divisor - 1);
        const dividend = quotient * divisor + remainder;
        
        // 确保被除数在2-4位数范围内
        if (dividend < 100 || dividend > 9999) {
          // 重新生成确保范围正确
          quotient = getRandomInt(Math.ceil(100 / divisor), Math.floor(9999 / divisor));
          remainder = getRandomInt(0, divisor - 1);
          const newDividend = quotient * divisor + remainder;
          
          isDivision = true;
          answer = `${quotient}……${remainder}`;
          question = `${newDividend} ÷ ${divisor}`;
        } else {
          isDivision = true;
          answer = `${quotient}……${remainder}`;
          question = `${dividend} ÷ ${divisor}`;
        }
        
        if (useShortcut && remainder === 0) {
          // 除法速算技巧：能整除的情况下，利用因数分解
          if (divisor === 4) {
            explanation = `速算技巧：÷4 = ÷2÷2，先除以2再除以2`;
          } else if (divisor === 6) {
            explanation = `速算技巧：÷6 = ÷2÷3，先除以2再除以3`;
          } else if (divisor === 8) {
            explanation = `速算技巧：÷8 = ÷2÷2÷2，连续除以2三次`;
          } else if (divisor === 9) {
            explanation = `速算技巧：÷9时，可以先看被除数各位数字之和是否为9的倍数`;
          } else if (divisor === 12) {
            explanation = `速算技巧：÷12 = ÷3÷4，先除以3再除以4`;
          } else if (divisor === 15) {
            explanation = `速算技巧：÷15 = ÷3÷5，先除以3再除以5`;
          } else if (divisor === 18) {
            explanation = `速算技巧：÷18 = ÷2÷9，先除以2再除以9`;
          }
        }
        break;
        
      default:
        answer = 100;
        question = '50 + 50';
    }
    
    return { 
      id, 
      type: 'mental', 
      difficulty, 
      question, 
      answer,
      isDivision,
      quotient,
      remainder,
      explanation
    };
  }
};

// 笔算题生成器
const generateWrittenProblem = (difficulty: Difficulty): Problem => {
  const id = Math.random().toString(36).substr(2, 9);
  
  if (difficulty === 'basic') {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const op = operations[getRandomInt(0, 3)];
    
    let question: string, answer: number | string;
    let isDivision = false;
    let quotient: number | undefined;
    let remainder: number | undefined;
    
    // 加减法不超过3题，其余留给乘除法
    const isAddSub = Math.random() < 0.3; // 30%概率是加减法
    
    if (isAddSub) {
      const addSubOp = Math.random() < 0.5 ? 'addition' : 'subtraction';
      
      switch (addSubOp) {
        case 'addition':
          // 基础难度加法：带小数的加法，最多2位小数，整数部分不超过千位数
          const a1 = getRandomDecimal(10, 999, 2);
          const a2 = getRandomDecimal(10, 999, 2);
          answer = Math.round((a1 + a2) * 100) / 100;
          question = `${a1} + ${a2}`;
          break;
          
        case 'subtraction':
          // 基础难度减法：带小数的减法，最多2位小数，整数部分不超过千位数
          const s2 = getRandomDecimal(10, 999, 2);
          const tempAnswer = getRandomDecimal(10, 999, 2);
          const s1 = Math.round((tempAnswer + s2) * 100) / 100;
          answer = tempAnswer;
          question = `${s1} - ${s2}`;
          break;
      }
    } else {
      // 乘除法
      const mulDivOp = Math.random() < 0.5 ? 'multiplication' : 'division';
      
      switch (mulDivOp) {
        case 'multiplication':
          const m1 = getRandomInt(100, 999);
          const m2 = getRandomInt(10, 99);
          answer = m1 * m2;
          question = `${m1} × ${m2}`;
          break;
          
        case 'division':
          const divisor = getRandomInt(2, 9);
          quotient = getRandomInt(10, 999);
          remainder = getRandomInt(0, divisor - 1);
          const dividend = quotient * divisor + remainder;
          
          isDivision = true;
          answer = `${quotient}……${remainder}`;
          question = `${dividend} ÷ ${divisor}`;
          break;
      }
    }
    
    return { 
      id, 
      type: 'written', 
      difficulty, 
      question, 
      answer,
      isDivision,
      quotient,
      remainder
    };
  } else {
    // 挑战难度：修正所有bug
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const op = operations[getRandomInt(0, 3)];
    
    let question: string, answer: number | string;
    let isDivision = false;
    let quotient: number | undefined;
    let remainder: number | undefined;
    
    switch (op) {
      case 'addition':
        // 挑战难度加法：50%概率出现小数，最多3位小数，整数部分不大于万位数
        const hasDecimalAdd = Math.random() < 0.5;
        if (hasDecimalAdd) {
          const a1 = getRandomDecimal(100, 9999, 3);
          const a2 = getRandomDecimal(100, 9999, 3);
          answer = Math.round((a1 + a2) * 1000) / 1000;
          question = `${a1} + ${a2}`;
        } else {
          const a1 = getRandomInt(100, 9999);
          const a2 = getRandomInt(100, 9999);
          answer = a1 + a2;
          question = `${a1} + ${a2}`;
        }
        break;
        
      case 'subtraction':
        // 挑战难度减法：50%概率出现小数，最多3位小数，整数部分不大于万位数
        const hasDecimalSub = Math.random() < 0.5;
        if (hasDecimalSub) {
          const s2 = getRandomDecimal(100, 9999, 3);
          const tempAnswer = getRandomDecimal(100, 9999, 3);
          const s1 = Math.round((tempAnswer + s2) * 1000) / 1000;
          answer = tempAnswer;
          question = `${s1} - ${s2}`;
        } else {
          const s2 = getRandomInt(100, 9999);
          const tempAnswer = getRandomInt(100, 9999);
          const s1 = tempAnswer + s2;
          answer = tempAnswer;
          question = `${s1} - ${s2}`;
        }
        break;
        
      case 'multiplication':
        // 挑战难度乘法：50%概率出现小数，任一乘数至少是2位数，最终积最多6位数
        const hasDecimalMul = Math.random() < 0.5;
        if (hasDecimalMul) {
          // 一个乘数为小数（最多3位小数），另一个为整数（最多3位数）
          const decimalFactor = getRandomDecimal(10, 999, 3);
          const integerFactor = getRandomInt(10, 999);
          
          // 确保积不超过6位数
          const product = decimalFactor * integerFactor;
          if (product <= 999999) {
            answer = Math.round(product * 1000) / 1000;
            question = Math.random() < 0.5 
              ? `${decimalFactor} × ${integerFactor}`
              : `${integerFactor} × ${decimalFactor}`;
          } else {
            // 如果积超过6位数，重新生成较小的数
            const smallDecimal = getRandomDecimal(10, 99, 3);
            const smallInteger = getRandomInt(10, 99);
            answer = Math.round((smallDecimal * smallInteger) * 1000) / 1000;
            question = Math.random() < 0.5 
              ? `${smallDecimal} × ${smallInteger}`
              : `${smallInteger} × ${smallDecimal}`;
          }
        } else {
          // 两个整数相乘，任一乘数至少是2位数，积最多6位数
          const m1 = getRandomInt(10, 999);
          const m2 = getRandomInt(10, 999);
          const product = m1 * m2;
          
          if (product <= 999999) {
            answer = product;
            question = `${m1} × ${m2}`;
          } else {
            // 如果积超过6位数，重新生成较小的数
            const smallM1 = getRandomInt(10, 99);
            const smallM2 = getRandomInt(10, 99);
            answer = smallM1 * smallM2;
            question = `${smallM1} × ${smallM2}`;
          }
        }
        break;
        
      case 'division':
        // 挑战难度除法：被除数为2-4位数（100-9999），除数为2位数（10-99）
        const divisor = getRandomInt(10, 99);
        quotient = getRandomInt(Math.ceil(100 / divisor), Math.floor(9999 / divisor));
        remainder = getRandomInt(0, divisor - 1);
        const dividend = quotient * divisor + remainder;
        
        // 确保被除数在2-4位数范围内（100-9999）
        if (dividend >= 100 && dividend <= 9999) {
          isDivision = true;
          answer = `${quotient}……${remainder}`;
          question = `${dividend} ÷ ${divisor}`;
        } else {
          // 重新生成确保范围正确
          const newQuotient = getRandomInt(10, 99); // 确保商是2位数
          const newRemainder = getRandomInt(0, divisor - 1);
          const newDividend = newQuotient * divisor + newRemainder;
          
          isDivision = true;
          answer = `${newQuotient}……${newRemainder}`;
          question = `${newDividend} ÷ ${divisor}`;
        }
        break;
        
      default:
        answer = 50000;
        question = '25000 + 25000';
    }
    
    return { 
      id, 
      type: 'written', 
      difficulty, 
      question, 
      answer,
      isDivision,
      quotient,
      remainder
    };
  }
};

// 多步复合算式生成器 - 根据新规则重新实现，增加运算顺序和括号变化考察
const generateMixedProblem = (difficulty: Difficulty): Problem => {
  const id = Math.random().toString(36).substr(2, 9);
  
  if (difficulty === 'basic') {
    // 基础难度：2-3步运算，最多一层括号，增加运算顺序考察
    const problemTypes = [
      'two_step_add_sub', 'two_step_mul_div', 'bracket_add_sub', 'bracket_mul_div', 
      'distributive_law', 'operation_order', 'simple_bracket_change'
    ];
    const weights = [0.25, 0.25, 0.2, 0.2, 0.15, 0.1, 0.05]; // 调整权重，增加新题型
    
    // 根据权重随机选择题目类型
    const rand = Math.random();
    let cumulativeWeight = 0;
    let selectedType = problemTypes[0];
    
    for (let i = 0; i < problemTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (rand <= cumulativeWeight) {
        selectedType = problemTypes[i];
        break;
      }
    }
    
    let question: string, answer: number | string, explanation: string | undefined;
    
    switch (selectedType) {
      case 'two_step_add_sub': {
        // 加减混合：a + b - c 或 a - b + c
        const a = getRandomInt(10, 100);
        const b = getRandomInt(10, 100);
        const c = getRandomInt(10, 100);
        
        if (Math.random() < 0.5) {
          answer = a + b - c;
          question = `${a} + ${b} - ${c}`;
        } else {
          answer = a - b + c;
          question = `${a} - ${b} + ${c}`;
        }
        break;
      }
      
      case 'two_step_mul_div': {
        // 乘除混合：a × b ÷ c 或 a ÷ b × c
        if (Math.random() < 0.5) {
          const a = getRandomInt(10, 100);
          const b = getRandomInt(2, 20);
          const c = getRandomInt(2, 9);
          // 确保能整除
          const product = a * b;
          if (product % c === 0) {
            answer = product / c;
            question = `${a} × ${b} ÷ ${c}`;
          } else {
            // 重新生成确保整除
            const newA = getRandomInt(2, 20);
            const newC = getRandomInt(2, 9);
            const newB = newC * getRandomInt(2, 10);
            answer = newA * newB / newC;
            question = `${newA} × ${newB} ÷ ${newC}`;
          }
        } else {
          const dividend = getRandomInt(100, 1000);
          const divisor = getRandomInt(2, 9);
          const multiplier = getRandomInt(2, 20);
          // 确保能整除
          const adjustedDividend = Math.floor(dividend / divisor) * divisor;
          answer = (adjustedDividend / divisor) * multiplier;
          question = `${adjustedDividend} ÷ ${divisor} × ${multiplier}`;
        }
        break;
      }
      
      case 'bracket_add_sub': {
        // 含括号的加减：(a + b) × c 或 (a - b) × c
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        const c = getRandomInt(2, 20);
        
        if (Math.random() < 0.5) {
          answer = (a + b) * c;
          question = `(${a} + ${b}) × ${c}`;
        } else {
          // 确保 a > b
          const largerA = Math.max(a, b) + getRandomInt(1, 20);
          const smallerB = Math.min(a, b);
          answer = (largerA - smallerB) * c;
          question = `(${largerA} - ${smallerB}) × ${c}`;
        }
        break;
      }
      
      case 'bracket_mul_div': {
        // 含括号的乘除：a + b × c 或 a - b × c
        const a = getRandomInt(50, 200);
        const b = getRandomInt(2, 20);
        const c = getRandomInt(2, 10);
        
        if (Math.random() < 0.5) {
          answer = a + b * c;
          question = `${a} + ${b} × ${c}`;
        } else {
          // 确保结果为正数
          const product = b * c;
          const adjustedA = Math.max(a, product + getRandomInt(10, 50));
          answer = adjustedA - product;
          question = `${adjustedA} - ${b} × ${c}`;
        }
        break;
      }
      
      case 'distributive_law': {
        // 乘法分配律：a × b + a × c（可化简）
        const a = getRandomInt(2, 9);
        const b = getRandomInt(5, 20);
        const c = getRandomInt(5, 20);
        
        answer = a * b + a * c;
        question = `${a} × ${b} + ${a} × ${c}`;
        explanation = `可以提取公因数 ${a}：${a} × (${b} + ${c}) = ${a} × ${b + c} = ${answer}`;
        break;
      }
      
      case 'operation_order': {
        // 运算顺序考察：a + b × c（先乘后加）
        const a = getRandomInt(10, 50);
        const b = getRandomInt(2, 15);
        const c = getRandomInt(2, 10);
        
        answer = a + b * c;
        question = `${a} + ${b} × ${c}`;
        explanation = `按运算顺序：先算乘法 ${b} × ${c} = ${b * c}，再算加法 ${a} + ${b * c} = ${answer}`;
        break;
      }
      
      case 'simple_bracket_change': {
        // 简单括号变化：a - (b + c) = a - b - c
        const a = getRandomInt(50, 100);
        const b = getRandomInt(10, 30);
        const c = getRandomInt(10, 30);
        
        // 确保结果为正数
        const sum = b + c;
        const adjustedA = Math.max(a, sum + getRandomInt(10, 30));
        
        answer = adjustedA - sum;
        question = `${adjustedA} - (${b} + ${c})`;
        explanation = `去括号：${adjustedA} - (${b} + ${c}) = ${adjustedA} - ${b} - ${c} = ${answer}`;
        break;
      }
      
      default: {
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        answer = a + b;
        question = `${a} + ${b}`;
      }
    }
    
    return { 
      id, 
      type: 'mixed', 
      difficulty, 
      question, 
      answer,
      explanation
    };
  } else {
    // 挑战难度：3-5步运算，可达两层括号，包含陷阱题，增加复杂的运算顺序和括号变化考察
    const problemTypes = [
      'complex_brackets', 'distributive_advanced', 'trap_question', 'decimal_mixed',
      'complex_operation_order', 'advanced_bracket_change', 'mixed_order_trap'
    ];
    const weights = [0.2, 0.25, 0.25, 0.1, 0.1, 0.05, 0.05]; // 调整权重，增加新题型
    
    const rand = Math.random();
    let cumulativeWeight = 0;
    let selectedType = problemTypes[0];
    
    for (let i = 0; i < problemTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (rand <= cumulativeWeight) {
        selectedType = problemTypes[i];
        break;
      }
    }
    
    let question: string, answer: number | string, explanation: string | undefined;
    
    switch (selectedType) {
      case 'complex_brackets': {
        // 两层括号：((a + b) × c - d) ÷ e
        const a = getRandomInt(5, 30);
        const b = getRandomInt(5, 30);
        const c = getRandomInt(2, 15);
        const d = getRandomInt(2, 10);
        const e = getRandomInt(2, 8);
        
        const step1 = a + b;
        const step2 = step1 * c;
        const step3 = step2 - d;
        
        // 确保能整除
        const adjustedStep3 = Math.floor(step3 / e) * e;
        const adjustedD = step2 - adjustedStep3;
        
        answer = adjustedStep3 / e;
        question = `((${a} + ${b}) × ${c} - ${adjustedD}) ÷ ${e}`;
        break;
      }
      
      case 'distributive_advanced': {
        // 高级分配律应用
        const factor = getRandomInt(3, 12);
        const m = getRandomInt(5, 25);
        const n = getRandomInt(5, 25);
        const extra = getRandomInt(2, 10);
        
        if (Math.random() < 0.5) {
          // 正向应用：factor × (m + n) + extra
          answer = factor * (m + n) + extra;
          question = `${factor} × ${m} + ${factor} × ${n} + ${extra}`;
          explanation = `先提取公因数：${factor} × (${m} + ${n}) + ${extra} = ${factor} × ${m + n} + ${extra} = ${factor * (m + n)} + ${extra} = ${answer}`;
        } else {
          // 逆向应用：factor × m + factor × n
          answer = factor * m + factor * n;
          question = `${factor} × ${m} + ${factor} × ${n}`;
          explanation = `可以提取公因数：${factor} × (${m} + ${n}) = ${factor} × ${m + n} = ${answer}`;
        }
        break;
      }
      
      case 'trap_question': {
        // 陷阱题：看似能简便运算，实际需要按顺序计算
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        const c = getRandomInt(3, 15);
        const d = getRandomInt(2, 10);
        
        // 故意让系数不同，无法提取公因数
        const factor1 = getRandomInt(3, 8);
        const factor2 = getRandomInt(3, 8);
        while (factor2 === factor1) {
          // 确保两个因数不同
          const newFactor2 = getRandomInt(3, 8);
          if (newFactor2 !== factor1) {
            break;
          }
        }
        
        answer = a * factor1 + b * factor2;
        question = `${a} × ${factor1} + ${b} × ${factor2}`;
        explanation = `注意：这题不能简便运算，需要分别计算再相加：${a * factor1} + ${b * factor2} = ${answer}`;
        break;
      }
      
      case 'decimal_mixed': {
        // 含小数的混合运算
        const a = getRandomDecimal(5, 50, 1);
        const b = getRandomDecimal(5, 50, 1);
        const c = getRandomInt(2, 10);
        const d = getRandomDecimal(1, 20, 1);
        
        if (Math.random() < 0.5) {
          answer = Math.round(((a + b) * c - d) * 10) / 10;
          question = `(${a} + ${b}) × ${c} - ${d}`;
        } else {
          answer = Math.round((a * c + b - d) * 10) / 10;
          question = `${a} × ${c} + ${b} - ${d}`;
        }
        break;
      }
      
      case 'complex_operation_order': {
        // 复杂运算顺序：a + b × c - d ÷ e（先乘除后加减）
        const a = getRandomInt(20, 80);
        const b = getRandomInt(3, 15);
        const c = getRandomInt(2, 10);
        const d = getRandomInt(20, 100);
        const e = getRandomInt(2, 10);
        
        // 确保除法能整除
        const adjustedD = Math.floor(d / e) * e;
        
        answer = a + b * c - adjustedD / e;
        question = `${a} + ${b} × ${c} - ${adjustedD} ÷ ${e}`;
        explanation = `按运算顺序：先算 ${b} × ${c} = ${b * c} 和 ${adjustedD} ÷ ${e} = ${adjustedD / e}，再算 ${a} + ${b * c} - ${adjustedD / e} = ${answer}`;
        break;
      }
      
      case 'advanced_bracket_change': {
        // 高级括号变化：a - (b - c) = a - b + c
        const a = getRandomInt(50, 120);
        const b = getRandomInt(30, 80);
        const c = getRandomInt(10, 40);
        
        // 确保 b > c 且结果为正数
        const adjustedB = Math.max(b, c + getRandomInt(5, 20));
        const adjustedA = Math.max(a, adjustedB + getRandomInt(10, 30));
        
        answer = adjustedA - adjustedB + c;
        question = `${adjustedA} - (${adjustedB} - ${c})`;
        explanation = `去括号变号：${adjustedA} - (${adjustedB} - ${c}) = ${adjustedA} - ${adjustedB} + ${c} = ${answer}`;
        break;
      }
      
      case 'mixed_order_trap': {
        // 混合运算顺序陷阱：a × b + c × d - e（看似复杂实际按顺序计算）
        const a = getRandomInt(5, 15);
        const b = getRandomInt(3, 12);
        const c = getRandomInt(4, 16);
        const d = getRandomInt(2, 8);
        const e = getRandomInt(10, 50);
        
        answer = a * b + c * d - e;
        question = `${a} × ${b} + ${c} × ${d} - ${e}`;
        explanation = `按运算顺序：先算乘法 ${a} × ${b} = ${a * b}，${c} × ${d} = ${c * d}，再算 ${a * b} + ${c * d} - ${e} = ${answer}`;
        break;
      }
      
      default: {
        const a = getRandomInt(10, 50);
        const b = getRandomInt(10, 50);
        const c = getRandomInt(2, 10);
        answer = (a + b) * c;
        question = `(${a} + ${b}) × ${c}`;
      }
    }
    
    return { 
      id, 
      type: 'mixed', 
      difficulty, 
      question, 
      answer,
      explanation
    };
  }
};

// 运算律与规则综合算式生成器
const generatePropertiesProblem = (difficulty: Difficulty): Problem => {
  const id = Math.random().toString(36).substr(2, 9);
  
  if (difficulty === 'basic') {
    const properties = ['commutative', 'associative', 'judgment'];
    const prop = properties[getRandomInt(0, 2)];
    
    switch (prop) {
      case 'commutative': {
        const a = getRandomInt(5, 50);
        const b = getRandomInt(5, 50);
        const commutativeQuestion = `${a} + __ = __ + ${a}`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: commutativeQuestion,
          answer: b,
          explanation: '根据加法交换律：a + b = b + a'
        };
      }
        
      case 'associative': {
        const x = getRandomInt(5, 30);
        const y = getRandomInt(5, 30);
        const z = getRandomInt(5, 30);
        const associativeQuestion = `(${x} + ${y}) + ${z} = ${x} + (__ + ${z})`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: associativeQuestion,
          answer: y,
          explanation: '根据加法结合律：(a + b) + c = a + (b + c)'
        };
      }
        
      case 'judgment': {
        const p = getRandomInt(5, 20);
        const q = getRandomInt(5, 20);
        const isCorrect = Math.random() < 0.5;
        const result1 = p + q;
        const result2 = isCorrect ? q + p : q + p + 1;
        const judgmentQuestion = `判断：${p} + ${q} = ${result2} 是否正确？`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: judgmentQuestion,
          answer: isCorrect ? '正确' : '错误',
          isMultipleChoice: true,
          choices: ['正确', '错误'],
          correctChoice: isCorrect ? 0 : 1
        };
      }
        
      default:
        return {
          id,
          type: 'properties',
          difficulty,
          question: '5 + 3 = 3 + __',
          answer: 5
        };
    }
  } else {
    // 挑战难度：分配律、提公因式
    const properties = ['distributive', 'factoring', 'comparison'];
    const prop = properties[getRandomInt(0, 2)];
    
    switch (prop) {
      case 'distributive': {
        const a = getRandomInt(3, 15);
        const b = getRandomInt(5, 25);
        const c = getRandomInt(5, 25);
        const distributiveQuestion = `${a} × (${b} + ${c}) = ${a} × __ + ${a} × __`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: distributiveQuestion,
          answer: `${b}, ${c}`,
          explanation: '根据乘法分配律：a × (b + c) = a × b + a × c'
        };
      }
        
      case 'factoring': {
        const factor = getRandomInt(3, 12);
        const m = getRandomInt(5, 20);
        const n = getRandomInt(5, 20);
        const factoringQuestion = `${factor} × ${m} + ${factor} × ${n} = __ × (${m} + ${n})`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: factoringQuestion,
          answer: factor,
          explanation: '提取公因数：ab + ac = a(b + c)'
        };
      }
        
      case 'comparison': {
        const x = getRandomInt(5, 20);
        const y = getRandomInt(5, 20);
        const z = getRandomInt(5, 20);
        const expr1 = x * (y + z);
        const expr2 = x * y + x * z;
        const comparisonQuestion = `比较：${x} × (${y} + ${z}) __ ${x} × ${y} + ${x} × ${z}`;
        return {
          id,
          type: 'properties',
          difficulty,
          question: comparisonQuestion,
          answer: '=',
          isMultipleChoice: true,
          choices: ['>', '<', '='],
          correctChoice: 2,
          explanation: '根据乘法分配律，两式相等'
        };
      }
        
      default:
        return {
          id,
          type: 'properties',
          difficulty,
          question: '3 × (4 + 5) = 3 × __ + 3 × __',
          answer: '4, 5'
        };
    }
  }
};

// 确保四种运算类型平均分布的生成函数
const generateMentalProblemsBalanced = (difficulty: Difficulty): Problem[] => {
  const problems: Problem[] = [];
  const operations = ['+', '-', '×', '÷'];
  const problemsPerOperation = 5; // 每种运算5题
  
  for (const op of operations) {
    for (let i = 0; i < problemsPerOperation; i++) {
      const id = Math.random().toString(36).substr(2, 9);
      let question: string, answer: number | string;
      let isDivision = false;
      let quotient: number | undefined;
      let remainder: number | undefined;
      let explanation: string | undefined;
      
      // 25%概率出现速算技巧题
      const useShortcut = Math.random() < 0.25;
      
      switch (op) {
        case '+':
          if (useShortcut) {
            // 加法速算技巧：凑整
            const base = getRandomInt(2, 9) * 100;
            const offset1 = getRandomInt(1, 20);
            const offset2 = getRandomInt(1, 20);
            const num1 = base - offset1;
            const num2 = base + offset2;
            answer = num1 + num2;
            question = `${num1} + ${num2}`;
            explanation = `可以凑整计算：${num1} + ${num2} = (${base} - ${offset1}) + (${base} + ${offset2}) = ${base * 2} + ${offset2 - offset1} = ${answer}`;
          } else {
            const a1 = getRandomInt(100, 9999);
            const a2 = getRandomInt(100, 9999);
            answer = a1 + a2;
            question = `${a1} + ${a2}`;
          }
          break;
          
        case '-':
          if (useShortcut) {
            // 减法速算技巧：接近整百数的减法
            const base = getRandomInt(3, 9) * 100;
            const offset = getRandomInt(1, 15);
            const minuend = getRandomInt(1000, 9999);
            const subtrahend = base - offset;
            answer = minuend - subtrahend;
            question = `${minuend} - ${subtrahend}`;
            explanation = `可以这样计算：${minuend} - ${subtrahend} = ${minuend} - ${base} + ${offset} = ${minuend - base} + ${offset} = ${answer}`;
          } else {
            const s2 = getRandomInt(100, 9999);
            const tempAnswer = getRandomInt(100, 9999);
            const s1 = tempAnswer + s2;
            answer = tempAnswer;
            question = `${s1} - ${s2}`;
          }
          break;
          
        case '×':
          if (useShortcut) {
            // 乘法速算技巧：接近整十数或整百数的乘法
            const base = getRandomInt(2, 9) * (Math.random() < 0.5 ? 10 : 100);
            const offset = getRandomInt(1, Math.min(10, base / 10));
            const multiplier = getRandomInt(2, 9);
            const multiplicand = base + (Math.random() < 0.5 ? offset : -offset);
            answer = multiplicand * multiplier;
            question = `${multiplicand} × ${multiplier}`;
            explanation = `可以分解计算：${multiplicand} × ${multiplier} = (${base} ${multiplicand > base ? '+' : '-'} ${Math.abs(multiplicand - base)}) × ${multiplier} = ${base * multiplier} ${multiplicand > base ? '+' : '-'} ${Math.abs(multiplicand - base) * multiplier} = ${answer}`;
          } else {
            // 普通乘法：两个十位数相乘，或一个个位数与一个十到万位数相乘
            const multiType = Math.random() < 0.5 ? 'two_tens' : 'single_multi';
            
            if (multiType === 'two_tens') {
              const m1 = getRandomInt(10, 99);
              const m2 = getRandomInt(10, 99);
              answer = m1 * m2;
              question = `${m1} × ${m2}`;
            } else {
              const singleDigit = getRandomInt(2, 9);
              const multiDigit = getRandomInt(10, 9999);
              
              if (Math.random() < 0.5) {
                answer = singleDigit * multiDigit;
                question = `${singleDigit} × ${multiDigit}`;
              } else {
                answer = multiDigit * singleDigit;
                question = `${multiDigit} × ${singleDigit}`;
              }
            }
          }
          break;
          
        case '÷':
          // 除法：被除数为2-4位数（100-9999），除数从3-19中取
          const divisor = getRandomInt(3, 19);
          quotient = getRandomInt(Math.ceil(100 / divisor), Math.floor(9999 / divisor));
          remainder = getRandomInt(0, divisor - 1);
          const dividend = quotient * divisor + remainder;
          
          isDivision = true;
          answer = `${quotient}……${remainder}`;
          question = `${dividend} ÷ ${divisor}`;
          
          if (useShortcut && remainder === 0) {
            // 除法速算技巧：能整除的情况下，利用因数分解
            if (divisor === 4) {
              explanation = `速算技巧：÷4 = ÷2÷2，先除以2再除以2`;
            } else if (divisor === 6) {
              explanation = `速算技巧：÷6 = ÷2÷3，先除以2再除以3`;
            } else if (divisor === 8) {
              explanation = `速算技巧：÷8 = ÷2÷2÷2，连续除以2三次`;
            } else if (divisor === 9) {
              explanation = `速算技巧：÷9时，可以先看被除数各位数字之和是否为9的倍数`;
            } else if (divisor === 12) {
              explanation = `速算技巧：÷12 = ÷3÷4，先除以3再除以4`;
            } else if (divisor === 15) {
              explanation = `速算技巧：÷15 = ÷3÷5，先除以3再除以5`;
            } else if (divisor === 18) {
              explanation = `速算技巧：÷18 = ÷2÷9，先除以2再除以9`;
            }
          }
          break;
      }
      
      problems.push({
        id,
        type: 'mental',
        difficulty,
        question,
        answer,
        isDivision,
        quotient,
        remainder,
        explanation
      });
    }
  }
  
  // 打乱顺序
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }
  
  return problems;
};

export const generateProblems = (type: ProblemType, difficulty: Difficulty): Problem[] => {
  // 修改题目数量：多步复合算式改为10题
  const counts = {
    mental: 20,
    written: 10,
    mixed: 10,  // 从5题改为10题
    properties: 5
  };
  
  const count = counts[type];
  const problems: Problem[] = [];
  
  // 对于口算挑战难度，使用平衡生成函数确保四种运算平均分布
  if (type === 'mental' && difficulty === 'challenge') {
    return generateMentalProblemsBalanced(difficulty);
  }
  
  for (let i = 0; i < count; i++) {
    let problem: Problem;
    
    switch (type) {
      case 'mental':
        problem = generateMentalProblem(difficulty);
        break;
      case 'written':
        problem = generateWrittenProblem(difficulty);
        break;
      case 'mixed':
        problem = generateMixedProblem(difficulty);
        break;
      case 'properties':
        problem = generatePropertiesProblem(difficulty);
        break;
      default:
        problem = generateMentalProblem(difficulty);
    }
    
    problems.push(problem);
  }
  
  return problems;
};