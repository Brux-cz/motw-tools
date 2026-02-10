/**
 * GM Tools — tool_use definitions for AI GM to create entities during session
 */

/**
 * Tool definitions for Anthropic API tool_use
 */
export const GM_TOOLS = [
  {
    name: 'create_location',
    description: 'Vytvoř novou lokaci, když příběh vyžaduje místo, které není v přípravě záhady. Používej jen když lovci potřebují jít někam, co v záhadě neexistuje.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Název lokace (česky), např. "Opuštěný sklad", "Hřbitovní kaple"'
        },
        type: {
          type: 'string',
          description: 'Typ lokace, např. "budova", "les", "jeskyně", "ulice"'
        },
        description: {
          type: 'string',
          description: 'Krátký popis lokace (1-2 věty, česky)'
        }
      },
      required: ['name', 'type', 'description']
    }
  },
  {
    name: 'create_npc',
    description: 'Vytvoř novou postavu (NPC), když příběh vyžaduje interakci s někým, kdo není v přípravě záhady. Používej jen když lovci mluví s někým novým.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Jméno postavy (české), např. "Jana Krátká", "Starý Tomáš"'
        },
        type: {
          type: 'string',
          description: 'Typ přihlížejícího podle MotW: Svědek, Oběť, Pomocník, Skeptik, Klevetník, Úředník, Všetečný, Detektiv'
        },
        motivation: {
          type: 'string',
          description: 'Motivace postavy (1 věta, česky)'
        },
        description: {
          type: 'string',
          description: 'Krátký popis postavy (1-2 věty, česky)'
        }
      },
      required: ['name', 'type', 'description']
    }
  },
  {
    name: 'move_hunters',
    description: 'Přesuň lovce na jinou lokaci. Používej když příběh přirozeně směřuje jinam nebo když lovci vyjádří záměr přesunout se.',
    input_schema: {
      type: 'object',
      properties: {
        locationName: {
          type: 'string',
          description: 'Název cílové lokace (musí být existující nebo právě vytvořená lokace)'
        }
      },
      required: ['locationName']
    }
  }
];

/**
 * Process tool calls from AI response and apply them to GM engine
 * @param {Array} toolCalls - Array of { id, name, input } objects
 * @param {Object} gmEngine - GMEngine instance
 * @returns {Array} Results of processed tool calls
 */
export function processToolCalls(toolCalls, gmEngine) {
  const results = [];

  for (const call of toolCalls) {
    try {
      switch (call.name) {
        case 'create_location': {
          const loc = gmEngine.addImprovisedLocation({
            name: call.input.name,
            type: call.input.type,
            description: call.input.description
          });
          results.push({ toolId: call.id, success: true, type: 'location', entity: loc });
          console.log(`[GM Tools] Created location: ${call.input.name}`);
          break;
        }

        case 'create_npc': {
          const npc = gmEngine.addImprovisedNPC({
            name: call.input.name,
            type: call.input.type,
            motivation: call.input.motivation || '',
            description: call.input.description
          });
          results.push({ toolId: call.id, success: true, type: 'npc', entity: npc });
          console.log(`[GM Tools] Created NPC: ${call.input.name}`);
          break;
        }

        case 'move_hunters': {
          const locationName = call.input.locationName?.toLowerCase();
          const allLocations = gmEngine.getAllLocations();
          const target = allLocations.find(l => l.name.toLowerCase() === locationName);

          if (target) {
            // changeScene is async but we don't await here — it will be handled
            results.push({ toolId: call.id, success: true, type: 'move', locationId: target.id, locationName: target.name });
            console.log(`[GM Tools] Move hunters to: ${target.name}`);
          } else {
            console.warn(`[GM Tools] Location not found for move: ${call.input.locationName}`);
            results.push({ toolId: call.id, success: false, error: 'Location not found' });
          }
          break;
        }

        default:
          console.warn(`[GM Tools] Unknown tool: ${call.name}`);
          results.push({ toolId: call.id, success: false, error: `Unknown tool: ${call.name}` });
      }
    } catch (error) {
      console.error(`[GM Tools] Error processing ${call.name}:`, error);
      results.push({ toolId: call.id, success: false, error: error.message });
    }
  }

  return results;
}
