import OpenAI from "openai";

export const suggest = async (req, res) => {
  const { design, text, cheapest } = req.body || {};

  if (!process.env.OPENAI_API_KEY && process.env.OPENAI_DISABLE !== 'true') {
    return res.status(500).json({ error: "OPENAI_API_KEY no configurada en el servidor" });
  }

  // Si el desarrollador quiere forzar modo mock/local
  if (process.env.OPENAI_DISABLE === 'true' && !cheapest) {
    console.log('aiController.suggest - OPENAI_DISABLE=true, devolviendo respuesta mock');
    const mockSuggestions = [
      'Lámpara de escritorio con brazo articulado y pantalla opalina para luz difusa; usa bombilla LED de tonos cálidos para un ambiente acogedor.',
      'Lámpara con base metálica y pantalla translúcida que evita el deslumbramiento; elige una bombilla LED cálida si buscas eficiencia energética.',
      'Lámpara con brazo flexible y difusor; combina con bombilla de tono cálido y regulador de intensidad para versatilidad.'
    ];
    const mockComment = 'Respuesta mock: ejemplo genérico para desarrollo.';
    return res.json({ suggestion: mockSuggestions.join('\n\n'), suggestions: mockSuggestions, comment: mockComment });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Construimos prompt claramente, incluyendo la info `cheapest` si existe
    const systemPrompt = `Eres un asistente que da sugerencias prácticas y concisas para el diseño de lámparas. `;

    const userParts = [];
    if (design?.base) userParts.push(`base=${design.base}`);
    if (design?.shade) userParts.push(`pantalla=${design.shade}`);
    if (design?.bulb) userParts.push(`bombilla=${design.bulb}`);
    if (design?.price) userParts.push(`precio=${design.price}`);

    let userContent = `Diseño recibido: ${userParts.length ? userParts.join(', ') : 'N/A'}.`;
    if (cheapest && Object.keys(cheapest).length) {
      userContent += ` Datos de precio recibidos: opción más barata total=${cheapest.total || 0}.`; 
    }
    if (text) userContent += ` Mensaje usuario: ${text}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const temperature = process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.6;

    // Intentaremos llamar al modelo configurado y, si falla, probar modelos alternativos
    const requestedModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const candidateModels = [requestedModel, 'gpt-3.5-turbo', 'gpt-4o-mini'].filter((m, i, arr) => m && arr.indexOf(m) === i);

    const tryModels = async (models) => {
      for (const model of models) {
        try {
          console.log(`aiController.suggest - intentando modelo: ${model}`);
          const completion = await client.chat.completions.create({
            model,
            messages,
            max_tokens: 400,
            temperature,
          });
          const rawResp = completion?.choices?.[0]?.message?.content || '';
          if (rawResp) return { raw: rawResp, model };
        } catch (mErr) {
          const mMsg = (mErr && mErr.message) ? mErr.message : '';
          console.warn(`aiController.suggest - modelo ${model} falló:`, mMsg || mErr);
          // Si el error es de cuota/permiso (429/401/insufficient), abortamos inmediatamente
          if (mMsg.includes('429') || mMsg.toLowerCase().includes('quota') || mMsg.toLowerCase().includes('insufficient') || mMsg.includes('401') || mMsg.toLowerCase().includes('missing scopes')) {
            // relanzamos para que el catch externo lo procese (y aplique fallback o 502 según configuración)
            throw mErr;
          }
          // en otros errores, intentamos el siguiente modelo
        }
      }
      // Si todos fallaron, lanzamos para que el bloque catch superior lo maneje
      throw new Error('All model attempts failed');
    };

    const attempt = await tryModels(candidateModels);
    const raw = attempt.raw;

    // Intentamos parsear JSON; si falla, devolvemos el raw en 'suggestion' para facilitar debugging
    try {
      const parsed = JSON.parse(raw);
      return res.json(parsed);
    } catch (parseErr) {
      console.warn('aiController.suggest - respuesta no JSON del modelo, devolviendo raw', parseErr?.message);
      return res.json({ suggestion: raw, suggestions: [raw], comment: 'Respuesta no JSON del modelo' });
    }
  } catch (err) {
    console.error('Error en aiController.suggest:', err?.message || err);

    // Detectar errores de cuota/permiso
    const msg = (err && err.message) ? err.message : '';
    const isQuota = msg && (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded') || (err.code && err.code === 'insufficient_quota') || msg.toLowerCase().includes('insufficient'));

    const generateLocalSuggestions = (design = {}, cheapest = {}, userText = '') => {
      const parts = [];
      if (design.base) parts.push(`${design.base}`);
      if (design.shade) parts.push(`${design.shade}`);
      if (design.bulb) parts.push(`${design.bulb}`);

      const suggestions = [];
      const text = (userText || '').toString().toLowerCase();

      const wantsCheap = /econ|barat|precio|más barato|barato|economica|económica/.test(text);
      const wantsModern = /modern|moderno|moderna|minim|vanguard|scandi|nórdico|minimalista/.test(text);
      const wantsWarm = /cálid|calid|tibio|warm|cálida/.test(text);

      // Si el usuario pide barato o frontend envió cheapest, proponemos la opción económica
      if (wantsCheap || (cheapest && Object.keys(cheapest).length)) {
        if (cheapest && Object.keys(cheapest).length) {
          const base = cheapest.parts?.base?.value || 'base neutra';
          const shade = cheapest.parts?.shade?.value || 'pantalla sencilla';
          const bulb = cheapest.parts?.bulb?.value || 'bombilla económica';
          suggestions.push(`Opción económica: ${base} + ${shade} + ${bulb} — Precio estimado: ${cheapest.total || 'N/A'}`);
        } else {
          suggestions.push('Opción económica: elige combinaciones simples (base sencilla + pantalla ligera + bombilla LED básica) para reducir costos.');
        }
      }

      // Sugerencia basada en estilo/tema pedido
      if (wantsModern) {
        suggestions.push(`Sugerencia estilo moderno: usa una base de líneas simples, pantalla en tonos neutros y una bombilla LED de luz blanca cálida para aspecto limpio.`);
      } else if (parts.length) {
        suggestions.push(`Sugerencia: Para tu diseño (${parts.join(', ')}), prefiere una pantalla que suavice la luz y una bombilla ${wantsWarm ? 'de tono cálido' : 'LED eficiente'} según preferencia.`);
      }

      // Respuesta orientada a la pregunta libre del usuario
      if (text.includes('?') || text.length > 10) {
        // generar una respuesta directa a la consulta del usuario
        if (text.includes('recomend') || text.includes('me recomiendas') || text.includes('que me recomiendas')) {
          suggestions.push('Recomendación: Si buscas equilibrio entre precio y estética, escoge una base simple de madera, pantalla de tela y una bombilla LED cálida.');
        } else if (text.includes('ambient') || text.includes('ambiente')) {
          suggestions.push('Consejo de ambiente: usa bombilla de baja intensidad y pantalla clara para luz difusa y acogedora.');
        }
      }

      // Consejo práctico final
      suggestions.push('Consejo: Coloca la lámpara a la altura de los ojos para minimizar reflejos; considera un regulador de intensidad si quieres versatilidad.');

      // Dedupe y limitar a 3 sugerencias principales
      const uniq = Array.from(new Set(suggestions)).slice(0, 3);
      const comment = `Respuesta generada localmente.${cheapest?.total ? ' La opción más barata estimada tiene un costo de ' + cheapest.total + '.' : ''}`;
      const rawText = uniq.join('\n\n') + '\n\n' + comment;
      return { suggestion: rawText, suggestions: uniq, comment };
    };

    // Si todos los intentos de modelo fallaron, tratamoslo como un caso de fallo online
    if (msg && (msg.includes('All model attempts failed') || msg.includes('All model attempts'))) {
      console.warn('aiController.suggest - todos los intentos de modelo fallaron');
      if (process.env.OPENAI_FORCE_FALLBACK === 'true') {
        console.warn('OPENAI_FORCE_FALLBACK=true — devolviendo sugerencia local tras intentos fallidos de modelos');
        const local = generateLocalSuggestions(design || {}, cheapest || {}, text || '');
        return res.status(200).json(local);
      }
      return res.status(502).json({ error: 'All model attempts failed: OpenAI no devolvió respuesta válida en línea', suggestion: 'Comprueba tu OPENAI_API_KEY, permisos y cuotas en OpenAI dashboard' });
    }

    if (isQuota) {
      console.warn('OpenAI quota/permits issue');
      // Si el desarrollador explicitamente autorizó fallback, lo usamos
      if (process.env.OPENAI_FORCE_FALLBACK === 'true') {
        console.warn('OPENAI_FORCE_FALLBACK=true — usando fallback local');
        const local = generateLocalSuggestions(design || {}, cheapest || {}, text || '');
        return res.status(200).json(local);
      }

      // Por defecto devolvemos un error 502 para indicar que el servicio online falló
      return res.status(502).json({ error: 'OpenAI error: ' + (msg || 'problema de permisos/quotas'), suggestion: 'Revisa tu OPENAI_API_KEY y cuotas en OpenAI dashboard' });
    }

    return res.status(500).json({ error: err.message || 'Error interno al generar sugerencia' });
  }
};
