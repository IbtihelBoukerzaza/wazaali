{/* Filter toggle */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'nearest' && styles.filterBtnActive]}
            onPress={() => setActiveFilter('nearest')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilter === 'nearest' && styles.filterBtnTextActive,
              ]}
            >
              الأقرب
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'price' && styles.filterBtnActive]}
            onPress={() => setActiveFilter('price')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilter === 'price' && styles.filterBtnTextActive,
              ]}
            >
              السعر
            </Text>
          </TouchableOpacity>
        </View>
