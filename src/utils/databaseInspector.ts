import { supabase } from '../supabaseClient';

export async function inspectDatabase() {
  try {
    console.log("Starting database inspection...");
    
    // Get all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return;
    }
    
    console.log('Available tables:', tables.map(t => t.tablename));
    
    // For each table, get its columns
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', table.tablename);
      
      if (columnsError) {
        console.error(`Error fetching columns for table ${table.tablename}:`, columnsError);
        continue;
      }
      
      console.log(`Table ${table.tablename} columns:`, columns.map(c => `${c.column_name} (${c.data_type})`));
      
      // Try to fetch a sample of data from each table
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from(table.tablename)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.error(`Error fetching sample data from ${table.tablename}:`, sampleError);
        } else if (sampleData && sampleData.length > 0) {
          console.log(`Sample data from ${table.tablename}:`, sampleData[0]);
        } else {
          console.log(`No data found in table ${table.tablename}`);
        }
      } catch (e) {
        console.error(`Error accessing table ${table.tablename}:`, e);
      }
    }
    
    console.log("Database inspection complete");
  } catch (error) {
    console.error('Error during database inspection:', error);
  }
}
